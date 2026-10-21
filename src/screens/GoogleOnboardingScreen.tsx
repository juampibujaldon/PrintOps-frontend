// src/screens/GoogleOnboardingScreen.tsx
// Paso final del "Continuar con Google" cuando el email no tiene cuenta:
// crear un taller nuevo o unirse a uno con código de invitación.
// Recibe { onboardingToken, email, name, rememberMe } por location.state; sin eso vuelve a /login.
import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/layout/AuthLayout';
import { Button, TextField } from '../components/ui';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../hooks/useAuth';
import type { GoogleOnboardingState, InviteErrorState } from '../types/auth';
import { cx } from '../utils/cx';
import styles from './AuthScreens.module.css';

type Mode = 'create' | 'invite';

interface ApiError {
  response?: { status?: number; data?: { code?: string; message?: string } };
}

export default function GoogleOnboardingScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const { completeGoogleOnboarding } = useAuth();
  const { showToast } = useToast();

  const [mode, setMode] = useState<Mode>('create');
  const [workspaceName, setWorkspaceName] = useState('');
  const [inviteToken, setInviteToken] = useState('');
  const [codeError, setCodeError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  const params = location.state as GoogleOnboardingState | null;
  if (!params?.onboardingToken) return <Navigate to="/login" replace />;
  const { onboardingToken, email, rememberMe } = params;
  const defaultName = `Taller de ${email}`;

  const onSubmit = async () => {
    setCodeError(undefined);
    const code = inviteToken.trim();
    if (mode === 'invite' && !code) {
      setCodeError('Ingresá el código de invitación');
      return;
    }
    setLoading(true);
    try {
      await completeGoogleOnboarding(
        onboardingToken,
        rememberMe,
        mode === 'invite' ? { inviteToken: code } : { workspaceName: workspaceName.trim() || defaultName },
      );
      // Autenticado: PublicOnly redirige a la app.
    } catch (error) {
      const e = error as ApiError;
      const status = e?.response?.status;
      const errorCode = e?.response?.data?.code;
      const message = e?.response?.data?.message;
      if (status === 401) {
        showToast('La verificación con Google venció. Volvé a intentarlo.', { type: 'error' });
        navigate('/login');
      } else if (status === 409) {
        showToast(message || 'Ese email ya tiene una cuenta.', { type: 'error' });
        navigate('/login');
      } else if (errorCode?.startsWith('INVITE_')) {
        const state: InviteErrorState = { code: errorCode as InviteErrorState['code'], email, message };
        navigate('/invite-error', { state });
      } else {
        showToast(message || 'No se pudo completar el registro. Probá de nuevo.', { type: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  const options: { label: string; value: Mode }[] = [
    { label: 'Crear mi taller', value: 'create' },
    { label: 'Unirme con un código de invitación', value: 'invite' },
  ];

  return (
    <AuthLayout>
      <h1 className={styles.title}>¡Casi listo!</h1>
      <p className={styles.headerSubtitle} style={{ textAlign: 'left' }}>
        Vas a entrar con tu cuenta de Google:
      </p>
      <p className={styles.email}>{email}</p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void onSubmit();
        }}
        noValidate
      >
        <div className={styles.options} role="radiogroup" aria-label="Cómo querés continuar">
          {options.map((opt) => {
            const active = mode === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setMode(opt.value)}
                className={cx(styles.option, active && styles.optionActive)}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {mode === 'create' ? (
          <TextField
            label="Nombre del taller (opcional)"
            placeholder={defaultName}
            value={workspaceName}
            onChangeText={setWorkspaceName}
          />
        ) : (
          <TextField
            label="Código de invitación"
            placeholder="Código enviado por el manager"
            autoCapitalize="none"
            autoCorrect="off"
            value={inviteToken}
            onChangeText={setInviteToken}
            error={codeError}
          />
        )}

        <Button title="Continuar" type="submit" loading={loading} />
        <Button title="Cancelar" variant="ghost" className={styles.spacer} onPress={() => navigate('/login')} />
      </form>
    </AuthLayout>
  );
}
