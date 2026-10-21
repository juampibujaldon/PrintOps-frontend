import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { isGoogleSignInConfigured } from '../../constants/google';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../context/ToastContext';
import { googleErrorMessage } from '../../services/authService';
import Spinner from '../ui/Spinner';
import styles from './GoogleSignInButton.module.css';

interface Props {
  rememberMe?: boolean;
}

// Botón "Continuar con Google" (GoogleLogin de @react-oauth/google: devuelve el idToken en `credential`).
// 200 -> sesión iniciada (los guards redirigen solos). 202 -> /google-onboarding con state.
// No se renderiza si no hay client id configurado.
export default function GoogleSignInButton({ rememberMe = false }: Props) {
  const navigate = useNavigate();
  const { signInWithGoogle } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  if (!isGoogleSignInConfigured()) return null;

  const onCredential = async (idToken: string | undefined) => {
    if (!idToken) {
      showToast('Google no devolvió credenciales. Probá de nuevo.', { type: 'error' });
      return;
    }
    setLoading(true);
    try {
      const result = await signInWithGoogle(idToken, rememberMe);
      if (result.type === 'onboarding') {
        navigate('/google-onboarding', {
          state: {
            onboardingToken: result.onboardingToken,
            email: result.email,
            name: result.name,
            rememberMe,
          },
        });
      }
    } catch (error) {
      showToast(googleErrorMessage(error), { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrap} aria-busy={loading || undefined}>
      {loading ? (
        <div className={styles.loading}>
          <Spinner size={22} color="#3C4043" label="Iniciando sesión con Google" />
        </div>
      ) : (
        <GoogleLogin
          onSuccess={(res) => onCredential(res.credential)}
          onError={() => showToast('No se pudo iniciar sesión con Google. Probá de nuevo.', { type: 'error' })}
          text="continue_with"
          shape="rectangular"
          locale="es"
          width="320"
        />
      )}
    </div>
  );
}
