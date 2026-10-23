import { Link, useLocation } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import PrintOpsLogo from '../brand/PrintOpsLogo';
import { useAuth } from '../../hooks/useAuth';
import { useConfirm } from '../../context/ConfirmContext';
import { cx } from '../../utils/cx';
import { isNavItemActive, visibleSections } from './navItems';
import styles from './Sidebar.module.css';

interface Props {
  /** Se llama al navegar (para cerrar el drawer en mobile). */
  onNavigate?: () => void;
  className?: string;
}

const ROLE_LABEL = { MANAGER: 'Manager', TECNICO: 'Técnico' } as const;

export default function Sidebar({ onNavigate, className }: Props) {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const confirm = useConfirm();

  const onLogout = async () => {
    const ok = await confirm({
      title: 'Cerrar sesión',
      message: '¿Querés cerrar la sesión en este dispositivo?',
      confirmLabel: 'Cerrar sesión',
      destructive: true,
    });
    if (ok) {
      onNavigate?.();
      await logout();
    }
  };

  return (
    <nav className={cx(styles.sidebar, className)} aria-label="Navegación principal">
      <div className={styles.brand}>
        <PrintOpsLogo width={190} showSubtitle={false} />
      </div>
      <div className={styles.list}>
        {visibleSections(user?.role).map((section, i) => (
          <div key={section.title ?? i} className={styles.group}>
            {section.title && <p className={styles.groupTitle}>{section.title}</p>}
            <ul className={styles.groupList}>
              {section.items.map((item) => {
                const active = isNavItemActive(item, pathname);
                const Icon = item.icon;
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className={cx(styles.item, active && styles.active)}
                      aria-current={active ? 'page' : undefined}
                      onClick={onNavigate}
                    >
                      <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <div className={styles.footer}>
        {user ? (
          <div className={styles.user}>
            <span className={styles.email} title={user.email}>
              {user.email}
            </span>
            <span className={styles.role}>{ROLE_LABEL[user.role] ?? user.role}</span>
          </div>
        ) : null}
        <button type="button" className={styles.logout} onClick={onLogout}>
          <LogOut size={20} strokeWidth={1.75} aria-hidden="true" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </nav>
  );
}
