import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from 'react';
import { cx } from '../../utils/cx';
import styles from './IconButton.module.css';

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: ReactNode;
  /** Etiqueta accesible (obligatoria: el botón no tiene texto visible). */
  label: string;
  variant?: 'plain' | 'tinted' | 'danger';
  size?: 'md' | 'sm';
  onPress?: () => void;
}

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, label, variant = 'plain', size = 'md', onPress, onClick, type = 'button', className, ...rest },
  ref,
) {
  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    onPress?.();
  };
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cx(styles.btn, styles[variant], size === 'sm' && styles.sm, className)}
      onClick={handleClick}
      {...rest}
    >
      {icon}
    </button>
  );
});

export default IconButton;
