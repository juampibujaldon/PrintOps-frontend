import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, Menu } from 'lucide-react';
import { useShell } from '../layout/ShellContext';
import { cx } from '../../utils/cx';
import styles from './ScreenHeader.module.css';

interface Props {
  title: string;
  subtitle?: string;
  /** Muestra el botón volver: navigate(-1), o `backTo` si se indica. */
  showBack?: boolean;
  /** Ruta explícita para volver (implica showBack). Recomendado para pantallas que pueden abrirse por URL directa. */
  backTo?: string;
  /** Acciones a la derecha (IconButton, Button...). */
  rightContent?: ReactNode;
  className?: string;
}

// Encabezado con título grande. Dentro de AppShell muestra el botón hamburguesa en mobile
// (en desktop la sidebar está fija y el botón se oculta por CSS).
export default function ScreenHeader({ title, subtitle, showBack = false, backTo, rightContent, className }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const shell = useShell();

  const hasBack = showBack || !!backTo;
  const goBack = () => {
    if (backTo) navigate(backTo);
    // key === 'default': la página se abrió por URL directa/recarga, no hay historial interno.
    else if (location.key === 'default') navigate('/');
    else navigate(-1);
  };

  const showMenu = !!shell && !hasBack;

  return (
    <header className={cx(styles.container, className)}>
      <div className={styles.topBar}>
        <div className={styles.leading}>
          {hasBack ? (
            <button type="button" className={cx(styles.iconBtn, styles.back)} onClick={goBack} aria-label="Volver">
              <ChevronLeft size={28} strokeWidth={2} />
            </button>
          ) : null}
          {showMenu ? (
            <button type="button" className={cx(styles.iconBtn, styles.menu)} onClick={shell.openMenu} aria-label="Abrir menú">
              <Menu size={22} strokeWidth={1.75} />
            </button>
          ) : null}
        </div>
        <div className={styles.titleBlock}>
          <h1 className={styles.title}>{title}</h1>
          {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
        </div>
        {rightContent ? <div className={styles.right}>{rightContent}</div> : null}
      </div>
    </header>
  );
}
