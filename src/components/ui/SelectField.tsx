import { useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { cx } from '../../utils/cx';
import styles from './SelectField.module.css';

export interface SelectOption {
  value: string;
  label: string;
}

interface Props {
  label: string;
  /** Modo botón: texto mostrado. Modo select nativo: valor seleccionado. */
  value: string;
  /** Modo botón: abre un selector propio (p. ej. un Modal). */
  onPress?: () => void;
  /** Modo select nativo: si se pasa `options`, se renderiza un <select>. */
  options?: SelectOption[];
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export default function SelectField({ label, value, onPress, options, onChange, placeholder, disabled = false, className }: Props) {
  const id = useId();

  if (options) {
    return (
      <div className={cx(styles.container, className)}>
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
        <div className={styles.selectWrap}>
          <select
            id={id}
            className={styles.native}
            value={value}
            disabled={disabled}
            onChange={(e) => onChange?.(e.target.value)}
          >
            {placeholder ? (
              <option value="" disabled>
                {placeholder}
              </option>
            ) : null}
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <ChevronDown size={18} strokeWidth={1.75} className={styles.chevron} aria-hidden="true" />
        </div>
      </div>
    );
  }

  return (
    <div className={cx(styles.container, className)}>
      <span id={id} className={styles.label}>
        {label}
      </span>
      <button
        type="button"
        className={styles.select}
        onClick={onPress}
        disabled={disabled}
        aria-labelledby={id}
        aria-haspopup="dialog"
      >
        <span className={cx(styles.value, disabled && styles.disabled)}>{value}</span>
        <ChevronDown size={18} strokeWidth={1.75} className={styles.chevron} aria-hidden="true" />
      </button>
    </div>
  );
}
