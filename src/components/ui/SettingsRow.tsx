import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cx } from '../../utils/cx';
import styles from './SettingsRow.module.css';

interface Props {
  label: string;
  value?: string;
  /** Acción al tocar la fila (renderiza un <button>). */
  onPress?: () => void;
  /** Navegación al tocar la fila (renderiza un <Link>). */
  to?: string;
  icon?: ReactNode;
  showChevron?: boolean;
  isLast?: boolean;
  destructive?: boolean;
}

// Fila de lista agrupada estilo iOS.
export default function SettingsRow({ label, value, onPress, to, icon, showChevron = true, isLast = false, destructive = false }: Props) {
  const interactive = !!(onPress || to);
  const body = (
    <>
      {icon ? <span className={styles.icon}>{icon}</span> : null}
      <span className={cx(styles.content, !isLast && styles.border)}>
        <span className={styles.texts}>
          <span className={cx(styles.label, destructive && styles.destructive)}>{label}</span>
          {value ? <span className={styles.value}>{value}</span> : null}
        </span>
        {interactive && showChevron ? <ChevronRight size={18} strokeWidth={1.75} className={styles.chevron} aria-hidden="true" /> : null}
      </span>
    </>
  );

  if (to) {
    return (
      <Link to={to} className={cx(styles.row, styles.interactive)}>
        {body}
      </Link>
    );
  }
  if (onPress) {
    return (
      <button type="button" onClick={onPress} className={cx(styles.row, styles.interactive)}>
        {body}
      </button>
    );
  }
  return <div className={styles.row}>{body}</div>;
}
