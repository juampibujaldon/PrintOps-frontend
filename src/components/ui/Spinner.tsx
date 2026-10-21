import { cx } from '../../utils/cx';
import styles from './Spinner.module.css';

interface Props {
  size?: number;
  /** Color CSS; por defecto currentColor. */
  color?: string;
  /** Texto accesible (default "Cargando"). */
  label?: string;
  className?: string;
}

export default function Spinner({ size = 20, color, label = 'Cargando', className }: Props) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cx(styles.spinner, className)}
      style={{ width: size, height: size, color }}
    />
  );
}
