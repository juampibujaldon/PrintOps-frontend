import { useId } from 'react';
import { cx } from '../../utils/cx';
import styles from './SwitchRow.module.css';

interface Props {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
  isLast?: boolean;
}

export default function SwitchRow({ label, description, value, onValueChange, disabled = false, isLast = false }: Props) {
  const id = useId();
  return (
    <div className={styles.row}>
      <div className={cx(styles.inner, !isLast && styles.border)}>
        <div className={styles.content}>
          <span id={id} className={cx(styles.label, disabled && styles.disabled)}>
            {label}
          </span>
          {description ? <span className={styles.desc}>{description}</span> : null}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={value}
          aria-labelledby={id}
          disabled={disabled}
          className={cx(styles.track, value && styles.on)}
          onClick={() => onValueChange(!value)}
        >
          <span className={styles.thumb} />
        </button>
      </div>
    </div>
  );
}
