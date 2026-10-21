import { forwardRef, useId } from 'react';
import type { ChangeEvent, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';
import { cx } from '../../utils/cx';
import styles from './TextField.module.css';

type CommonProps = {
  label?: string;
  error?: string;
  hint?: string;
  /** Clase para el contenedor (el `className` va al input). */
  containerClassName?: string;
  /** Contenido al final del input (p. ej. unidad "g", "%"). */
  suffix?: ReactNode;
  /** Atajo a onChange que entrega solo el string (API del original RN). */
  onChangeText?: (value: string) => void;
  /** Agrega padding horizontal de formulario (usado por FormField). */
  padded?: boolean;
};

type InputProps = CommonProps & Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & { multiline?: false };
type AreaProps = CommonProps & TextareaHTMLAttributes<HTMLTextAreaElement> & { multiline: true };
export type TextFieldProps = InputProps | AreaProps;

// Compatible con react-hook-form: `<TextField {...register('email')} />` (forwardRef) o Controller.
const TextField = forwardRef<HTMLInputElement | HTMLTextAreaElement, TextFieldProps>(function TextField(props, ref) {
  const {
    label,
    error,
    hint,
    containerClassName,
    suffix,
    onChangeText,
    padded,
    multiline,
    className,
    onChange,
    id: idProp,
    ...rest
  } = props as CommonProps & { multiline?: boolean; className?: string; id?: string; onChange?: (e: ChangeEvent<never>) => void } & Record<string, unknown>;
  const autoId = useId();
  const id = idProp ?? autoId;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    (onChange as ((e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void) | undefined)?.(e);
    onChangeText?.(e.target.value);
  };

  const shared = {
    id,
    className: cx(styles.input, !!error && styles.invalid, multiline && styles.textarea, className),
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy,
    onChange: handleChange,
  };

  return (
    <div className={cx(styles.container, padded && styles.padded, containerClassName)}>
      {label ? (
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
      ) : null}
      <div className={styles.control}>
        {multiline ? (
          <textarea ref={ref as React.Ref<HTMLTextAreaElement>} {...shared} {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)} />
        ) : (
          <input ref={ref as React.Ref<HTMLInputElement>} {...shared} {...(rest as InputHTMLAttributes<HTMLInputElement>)} />
        )}
        {suffix ? <span className={styles.suffix}>{suffix}</span> : null}
      </div>
      {error ? (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      {hint && !error ? (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      ) : null}
    </div>
  );
});

export default TextField;
