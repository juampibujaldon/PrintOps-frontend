import { tint } from '../../constants/theme';
import { cx } from '../../utils/cx';
import styles from './Badge.module.css';

// Dos formas de uso: colores explícitos (bgColor/textColor) o un color sólido
// (color) del que se deriva un fondo suave. `pulse` agrega un punto animado
// para estados "en curso".
type BadgeProps = { className?: string } & (
  | { label: string; bgColor: string; textColor: string; color?: never; pulse?: boolean }
  | { label: string; color: string; bgColor?: never; textColor?: never; pulse?: boolean }
);

export default function Badge(props: BadgeProps) {
  const { label, pulse, className } = props;
  const fg = props.color ?? props.textColor!;
  const bg = props.color ? tint(props.color) : props.bgColor!;

  return (
    <span className={cx(styles.badge, className)} style={{ backgroundColor: bg, color: fg }}>
      {pulse ? <span className={styles.dot} style={{ backgroundColor: fg }} aria-hidden="true" /> : null}
      <span className={styles.text}>{label}</span>
    </span>
  );
}
