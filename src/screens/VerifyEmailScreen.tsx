// src/screens/VerifyEmailScreen.tsx
import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/layout/AuthLayout';
import { Button, TextField } from '../components/ui';
import { useAlert } from '../context/ConfirmContext';
import { useToast } from '../context/ToastContext';
import { authService } from '../services/authService';
import type { VerifyEmailState } from '../types/auth';
import styles from './AuthScreens.module.css';

interface ApiError {
  response?: { data?: { message?: string; error?: string } };
}

export default function VerifyEmailScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const alert = useAlert();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const email = (location.state as VerifyEmailState | null)?.email;
  // Sin email en location.state (p. ej. recarga o URL directa) no se puede reenviar: al login.
  if (!email) return <Navigate to="/login" replace />;

  const handleVerify = async () => {
    if (!code || code.length !== 6) {
      showToast('Ingresá el código de 6 dígitos.', { type: 'error', title: 'Error' });
      return;
    }
    setLoading(true);
    try {
      const message = await authService.verifyEmail(code);
      await alert({ title: '¡Éxito!', message, okLabel: 'Ir a Login' });
      navigate('/login');
    } catch (error) {
      const data = (error as ApiError)?.response?.data;
      showToast(data?.error || data?.message || 'No se pudo verificar el código.', { type: 'error', title: 'Error' });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      const message = await authService.resendVerification(email);
      showToast(message, { type: 'success', title: 'Email reenviado' });
    } catch (error) {
      const data = (error as ApiError)?.response?.data;
      showToast(data?.message || data?.error || 'No se pudo reenviar el email.', { type: 'error', title: 'Error' });
    }
  };

  return (
    <AuthLayout>
      <h1 className={styles.titleCenter}>Verificar Email</h1>
      <p className={`${styles.subtitle} ${styles.center}`}>Ingresá el código de 6 dígitos que enviamos a {email}</p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleVerify();
        }}
        noValidate
      >
        <TextField
          label="Código de verificación"
          placeholder="123456"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChangeText={setCode}
          containerClassName={styles.codeInput}
        />
        <Button title="Verificar" type="submit" loading={loading} />
      </form>

      <button type="button" className={styles.linkMuted} onClick={handleResend}>
        ¿No recibiste el código? Reenviar
      </button>
      <button type="button" className={styles.linkMuted} onClick={() => navigate('/login')}>
        Volver al Login
      </button>
    </AuthLayout>
  );
}
