import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from 'react';
import { cx } from '../../utils/cx';
import Spinner from './Spinner';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'tinted' | 'ghost' | 'danger';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'title'> {
  /** Texto del botón. */
  title: string;
  variant?: ButtonVariant;
  /** Alias de onClick (API del original RN). */
  onPress?: () => void;
  loading?: boolean;
  icon?: ReactNode;
  /** Ocupa todo el ancho disponible (default true). */
  fullWidth?: boolean;
  size?: 'md' | 'sm';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    title,
    variant = 'primary',
    onPress,
    onClick,
    disabled,
    loading,
    icon,
    fullWidth = true,
    size = 'md',
    type = 'button',
    className,
    ...rest
  },
  ref,
) {
  const inactive = disabled || loading;
  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (inactive) return;
    onClick?.(e);
    onPress?.();
  };
  return (
    <button
      ref={ref}
      type={type}
      className={cx(styles.button, styles[variant], size === 'sm' && styles.sm, fullWidth && styles.full, className)}
      disabled={inactive}
      aria-busy={loading || undefined}
      onClick={handleClick}
      {...rest}
    >
      {loading ? (
        <Spinner size={20} label="Cargando" />
      ) : (
        <>
          {icon}
          <span className={styles.label}>{title}</span>
        </>
      )}
    </button>
  );
});

export default Button;
