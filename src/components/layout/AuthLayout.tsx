import type { ReactNode } from 'react';
import { cx } from '../../utils/cx';
import styles from './AuthLayout.module.css';

interface Props {
  children: ReactNode;
  /** Ancho máximo de la columna (default 420px). */
  wide?: boolean;
  className?: string;
}

// Contenedor centrado para las pantallas de autenticación (login, registro, etc.).
export default function AuthLayout({ children, wide = false, className }: Props) {
  return (
    <main className={styles.page}>
      <div className={cx(styles.column, wide && styles.wide, className)}>{children}</div>
    </main>
  );
}
