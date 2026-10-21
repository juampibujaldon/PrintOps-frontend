// src/screens/RegisterScreen.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import AuthLayout from '../components/layout/AuthLayout';
import GoogleDivider from '../components/auth/GoogleDivider';
import GoogleSignInButton from '../components/auth/GoogleSignInButton';
import { Button, TextField } from '../components/ui';
import { useAlert, useConfirm } from '../context/ConfirmContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../hooks/useAuth';
import { apiErrorMessage } from '../services/authService';
import type { InviteErrorState, RegisterFormData } from '../types/auth';
import { cx } from '../utils/cx';
import styles from './AuthScreens.module.css';

const schema = yup.object({
  email: yup.string().email('Email inválido').required('El email es requerido'),
  password: yup
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .required('La contraseña es requerida'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password')], 'Las contraseñas no coinciden')
    .required('Debes confirmar la contraseña'),
  inviteToken: yup.string().optional(),
  workspaceName: yup.string().optional(),
});

export default function RegisterScreen() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const alert = useAlert();
  const confirm = useConfirm();
  const [loading, setLoading] = useState(false);
  // Siempre abre en "Crear taller" (también con location.state.mode === 'create', que llega desde /invite-error).
  const [isTecnico, setIsTecnico] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: yupResolver(schema),
    defaultValues: { email: '', password: '', confirmPassword: '', inviteToken: '', workspaceName: '' },
  });

  const onSubmit = async (data: RegisterFormData) => {
    if (isTecnico && !data.inviteToken?.trim()) {
      showToast('Ingresá el código de invitación que te envió el manager.', { type: 'error', title: 'Atención' });
      return;
    }
    setLoading(true);
    try {
      const message = await registerUser(
        data.email,
        data.password,
        isTecnico ? data.inviteToken?.trim() : undefined,
        isTecnico ? undefined : data.workspaceName?.trim(),
      );
      await alert({ title: '¡Éxito!', message, okLabel: 'Entendido' });
      navigate('/login');
    } catch (error) {
      const code: string | undefined = (error as { response?: { data?: { code?: string } } })?.response?.data?.code;
      const message = apiErrorMessage(error, 'Error al registrarse');
      if (code?.startsWith('INVITE_')) {
        // Invitación inválida/usada/vencida: pantalla dedicada con qué hacer en cada caso.
        const state: InviteErrorState = { code: code as InviteErrorState['code'], email: data.email, message };
        navigate('/invite-error', { state });
      } else if (code === 'EMAIL_TAKEN') {
        const goLogin = await confirm({
          title: 'Ese email ya tiene cuenta',
          message,
          confirmLabel: 'Iniciar sesión',
        });
        if (goLogin) navigate('/login');
      } else {
        showToast(message, { type: 'error', title: 'Error' });
      }
    } finally {
      setLoading(false);
    }
  };

  const modes = [
    { label: 'Crear taller', value: false },
    { label: 'Tengo invitación', value: true },
  ];

  return (
    <AuthLayout>
      <h1 className={styles.title}>Crear cuenta</h1>
      <p className={styles.subtitle}>Creá tu taller o unite a uno existente con una invitación.</p>

      <div className={styles.segment} role="group" aria-label="Tipo de registro">
        {modes.map((opt) => {
          const active = isTecnico === opt.value;
          return (
            <button
              key={opt.label}
              type="button"
              onClick={() => setIsTecnico(opt.value)}
              className={cx(styles.segmentItem, active && styles.segmentItemActive)}
              aria-pressed={active}
            >
              {opt.label}
            </button>
          );
        })}
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
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <TextField
          label="Confirmar contraseña"
          type="password"
          placeholder="Repetí la contraseña"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        {isTecnico ? (
          <TextField
            label="Código de invitación"
            placeholder="Código enviado por el manager"
            autoCapitalize="none"
            autoCorrect="off"
            error={errors.inviteToken?.message}
            {...register('inviteToken')}
          />
        ) : (
          <TextField
            label="Nombre del taller (opcional)"
            placeholder="Ej. Taller Central"
            error={errors.workspaceName?.message}
            {...register('workspaceName')}
          />
        )}

        <Button title={isTecnico ? 'Unirme al taller' : 'Crear taller'} type="submit" loading={loading} />

        <GoogleDivider />
        <GoogleSignInButton />
      </form>

      <p className={styles.switchRow}>
        <span>¿Ya tienes cuenta?</span>
        <button type="button" className={styles.inlineLink} onClick={() => navigate('/login')}>
          Iniciar sesión
        </button>
      </p>
    </AuthLayout>
  );
}
