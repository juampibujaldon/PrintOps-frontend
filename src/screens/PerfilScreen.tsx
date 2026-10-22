// src/screens/PerfilScreen.tsx
import { useState } from 'react';
import { ScreenHeader, SettingsRow, SettingsSection } from '../components/ui';
import { useConfirm } from '../context/ConfirmContext';
import { useAuth } from '../hooks/useAuth';
import page from './SettingsPage.module.css';
import styles from './PerfilScreen.module.css';

const ROLE_LABEL: Record<string, string> = {
  MANAGER: 'Manager',
  TECNICO: 'Técnico',
};

export default function PerfilScreen() {
  const { user, logout } = useAuth();
  const confirm = useConfirm();
  const [loggingOut, setLoggingOut] = useState(false);

  const confirmLogout = async () => {
    const ok = await confirm({
      title: 'Cerrar sesión',
      message: '¿Querés cerrar la sesión en este dispositivo?',
      confirmLabel: 'Cerrar sesión',
      destructive: true,
    });
    if (!ok) return;
    setLoggingOut(true);
    await logout();
  };

  const initial = user?.email?.charAt(0).toUpperCase() ?? '?';
  const role = ROLE_LABEL[user?.role ?? ''] ?? user?.role ?? '-';

  return (
    <>
      <ScreenHeader title="Mi perfil" />
      <div className={page.page}>
        <div className={styles.header}>
          <div className={styles.avatar} aria-hidden="true">
            {initial}
          </div>
          <p className={styles.email}>{user?.email ?? '-'}</p>
          <p className={styles.role}>{role}</p>
        </div>

        <SettingsSection title="Cuenta">
          <SettingsRow label="Email" value={user?.email ?? '-'} />
          <SettingsRow label="Rol" value={ROLE_LABEL[user?.role ?? ''] ?? '-'} isLast />
        </SettingsSection>

        <SettingsSection>
          <SettingsRow
            label={loggingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
            onPress={loggingOut ? undefined : confirmLogout}
            showChevron={false}
            destructive
            isLast
          />
        </SettingsSection>
      </div>
    </>
  );
}
