import { cx } from '../../utils/cx';
import styles from './Chip.module.css';

interface Props {
  label: string;
  selected: boolean;
  onPress: () => void;
  className?: string;
}

export default function Chip({ label, selected, onPress, className }: Props) {
  return (
    <button
      type="button"
      onClick={onPress}
      aria-pressed={selected}
      className={cx(styles.chip, selected && styles.selected, className)}
    >
      {label}
    </button>
  );
}
