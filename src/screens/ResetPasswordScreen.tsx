// src/screens/ResetPasswordScreen.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '../components/layout/AuthLayout';
import { Button, TextField } from '../components/ui';
import { useToast } from '../context/ToastContext';
import { authService } from '../services/authService';
import styles from './AuthScreens.module.css';

interface ApiError {
  response?: { data?: { message?: string } };
}

export default function ResetPasswordScreen() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const requestCode = async () => {
    if (!email.trim()) {
      showToast('Ingresá tu email.', { type: 'error', title: 'Atención' });
      return;
    }
    setLoading(true);
    try {
      const message = await authService.forgotPassword(email.trim());
      showToast(message, { type: 'success', title: 'Email enviado' });
      setStep('code');
    } catch (error) {
      showToast((error as ApiError)?.response?.data?.message || 'No se pudo enviar el email', { type: 'error', title: 'Error' });
    } finally {
      setLoading(false);
    }
  };

  const submitReset = async () => {
    if (!token.trim()) {
      showToast('Ingresá el código recibido por email.', { type: 'error', title: 'Atención' });
      return;
    }
    if (newPassword.length < 8) {
      showToast('La contraseña debe tener al menos 8 caracteres.', { type: 'error', title: 'Atención' });
      return;
    }
    setLoading(true);
    try {
      const message = await authService.resetPassword(token.trim(), newPassword);
      showToast(message, { type: 'success', title: 'Listo' });
      navigate('/login');
    } catch (error) {
      showToast((error as ApiError)?.response?.data?.message || 'No se pudo restablecer la contraseña', {
        type: 'error',
        title: 'Error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <h1 className={styles.titleCenter}>Recuperar contraseña</h1>

      {step === 'email' ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void requestCode();
          }}
          noValidate
        >
          <p className={`${styles.subtitle} ${styles.center}`}>
            Ingresá tu email y te enviaremos un código para restablecer la contraseña.
          </p>
          <TextField
            label="Email"
            type="email"
            placeholder="taller@ejemplo.com"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            value={email}
            onChangeText={setEmail}
          />
          <Button title="Enviar código" type="submit" loading={loading} />
        </form>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submitReset();
          }}
          noValidate
        >
          <p className={`${styles.subtitle} ${styles.center}`}>Ingresá el código recibido y tu nueva contraseña.</p>
          <TextField
            label="Código de reset"
            placeholder="Código recibido por email"
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="one-time-code"
            value={token}
            onChangeText={setToken}
          />
          <TextField
            label="Nueva contraseña"
            type="password"
            placeholder="Mínimo 8 caracteres"
            autoComplete="new-password"
            value={newPassword}
            onChangeText={setNewPassword}
          />
          <Button title="Restablecer contraseña" type="submit" loading={loading} />
        </form>
      )}

      <button type="button" className={styles.linkStrong} onClick={() => navigate('/login')}>
        Volver al inicio de sesión
      </button>
    </AuthLayout>
  );
}
