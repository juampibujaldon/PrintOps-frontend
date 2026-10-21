// src/screens/LoginScreen.tsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import PrintOpsLogo from '../components/brand/PrintOpsLogo';
import AuthLayout from '../components/layout/AuthLayout';
import GoogleDivider from '../components/auth/GoogleDivider';
import GoogleSignInButton from '../components/auth/GoogleSignInButton';
import { Button, TextField } from '../components/ui';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../hooks/useAuth';
import { apiErrorMessage } from '../services/authService';
import type { LoginFormData } from '../types/auth';
import styles from './AuthScreens.module.css';

const schema = yup.object({
  email: yup.string().email('Email inválido').required('El email es requerido'),
  password: yup
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .required('La contraseña es requerida'),
  rememberMe: yup.boolean().default(false),
});

export default function LoginScreen() {
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: yupResolver(schema),
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    try {
      await login(data.email, data.password, data.rememberMe);
      // Autenticado: PublicOnly redirige a la app.
    } catch (error) {
      showToast(apiErrorMessage(error, 'Error al iniciar sesión'), { type: 'error', title: 'Error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className={styles.header}>
        <PrintOpsLogo width={260} className={styles.logo} />
        <p className={styles.headerSubtitle}>Ingresá a tu taller para gestionar tus impresoras.</p>
      </div>

      <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
        <TextField
          label="Email"
          type="email"
          placeholder="taller@ejemplo.com"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          error={errors.email?.message}
          {...register('email')}
        />
        <TextField
          label="Contraseña"
          type="password"
          placeholder="Mínimo 8 caracteres"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />

        <label className={styles.remember}>
          <span>Recordar sesión por 30 días</span>
          <input type="checkbox" role="switch" className={styles.rememberInput} {...register('rememberMe')} />
          <span className={styles.switch} aria-hidden="true" />
        </label>

        <Button title="Ingresar" type="submit" loading={loading} />

        <GoogleDivider />
        <GoogleSignInButton rememberMe={watch('rememberMe')} />

        <Link to="/reset-password" className={styles.link}>
          ¿Olvidaste tu contraseña?
        </Link>
      </form>

      <p className={styles.switchRow}>
        <span>¿No tenés cuenta?</span>
        <button type="button" className={styles.inlineLink} onClick={() => navigate('/register')}>
          Registrate
        </button>
      </p>
    </AuthLayout>
  );
}
