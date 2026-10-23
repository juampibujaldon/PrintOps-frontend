import { cx } from '../../utils/cx';
import styles from './SegmentedControl.module.css';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  value: T;
  options: SegmentOption<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}

// Selector de opciones excluyentes (estilo iOS). Accesible como radiogroup.
export default function SegmentedControl<T extends string>({ value, options, onChange, ariaLabel, className }: Props<T>) {
  return (
    <div className={cx(styles.root, className)} role="radiogroup" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          className={cx(styles.option, o.value === value && styles.selected)}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
