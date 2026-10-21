import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, MouseEvent } from 'react';
import { cx } from '../../utils/cx';
import styles from './PressableScale.module.css';

export interface PressableScaleProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Alias de onClick, para mantener la API del original RN. */
  onPress?: () => void;
}

// <button> con feedback de presión sutil (escala + atenuado), solo con CSS.
const PressableScale = forwardRef<HTMLButtonElement, PressableScaleProps>(function PressableScale(
  { className, onPress, onClick, type = 'button', children, ...rest },
  ref,
) {
  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    onPress?.();
  };
  return (
    <button ref={ref} type={type} className={cx(styles.pressable, className)} onClick={handleClick} {...rest}>
      {children}
    </button>
  );
});

export default PressableScale;
