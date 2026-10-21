import { forwardRef } from 'react';
import TextField from './TextField';
import type { TextFieldProps } from './TextField';

// Campo de formulario con `label` obligatorio y padding horizontal (pantallas de ajustes).
// Mismas props que TextField (incluye `hint`, `error`, `multiline`).
type FormFieldProps = TextFieldProps & { label: string };

const FormField = forwardRef<HTMLInputElement | HTMLTextAreaElement, FormFieldProps>(function FormField(props, ref) {
  return <TextField ref={ref} padded {...props} />;
});

export default FormField;
