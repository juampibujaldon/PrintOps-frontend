// src/screens/AddPrinterScreen.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Camera, X } from 'lucide-react';
import { printerService } from '../services/printerService';
import type { PrinterData, PrinterStatus } from '../services/printerService';
import { usePhotoPicker } from '../hooks/usePhotoPicker';
import { useUploadsEnabled } from '../hooks/useUploadsEnabled';
import { useToast } from '../context/ToastContext';
import { Button, ScreenHeader, TextField } from '../components/ui';
import { cx } from '../utils/cx';
import styles from './AddPrinterScreen.module.css';

const formatDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const STATUS_OPTIONS: { value: PrinterStatus; label: string }[] = [
  { value: 'OPERATIVE', label: 'Operativa' },
  { value: 'MAINTENANCE', label: 'En mant.' },
  { value: 'OUT_OF_SERVICE', label: 'Fuera serv.' },
];

const schema = yup.object({
  name: yup.string().optional(),
  brand: yup.string().required('La marca es obligatoria'),
  model: yup.string().required('El modelo es obligatorio'),
  serialNumber: yup.string().required('El número de serie es obligatorio'),
  location: yup.string().optional(),
  purchaseDate: yup
    .string()
    .required('La fecha de compra es obligatoria')
    .matches(/^\d{4}-\d{2}-\d{2}$/, 'El formato debe ser YYYY-MM-DD'),
  status: yup
    .mixed<PrinterStatus>()
    .oneOf(['OPERATIVE', 'MAINTENANCE', 'OUT_OF_SERVICE'])
    .required('El estado es obligatorio'),
});

export default function AddPrinterScreen() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const picker = usePhotoPicker({ max: 1 });
  const uploadsEnabled = useUploadsEnabled();
  const photo = picker.photos[0];

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PrinterData>({
    resolver: yupResolver(schema),
    defaultValues: {
      name: '',
      brand: '',
      model: '',
      serialNumber: '',
      location: '',
      purchaseDate: formatDate(new Date()),
      status: 'OPERATIVE',
    },
  });

  const onSubmit = async (data: PrinterData) => {
    setLoading(true);
    try {
      const newPrinter = await printerService.createPrinter(data, photo?.file);
      navigate(`/printers/${newPrinter.id}`, { replace: true, state: { printer: newPrinter } });
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast(message || 'No se pudo guardar la impresora', { type: 'error', title: 'Error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <ScreenHeader title="Registrar Impresora" backTo="/printers" />

      <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
        {uploadsEnabled ? (
          <fieldset className={styles.photoSection}>
            <legend className={styles.photoLabel}>Foto (opcional)</legend>
            <div className={styles.photoContainer}>
              {photo ? (
                <div className={styles.photoPreviewWrapper}>
                  <img src={photo.previewUrl} alt="Vista previa de la impresora" className={styles.photoPreview} />
                  <button
                    type="button"
                    className={styles.removePhoto}
                    onClick={() => picker.remove(photo.id)}
                    aria-label="Quitar foto"
                  >
                    <X size={14} strokeWidth={2.5} />
                  </button>
                </div>
              ) : (
                <div className={styles.photoPlaceholder}>
                  <Camera size={28} strokeWidth={1.5} aria-hidden="true" />
                  <span>Sin foto</span>
                </div>
              )}
              <div className={styles.photoActions}>
                <Button
                  title="Cámara"
                  variant="secondary"
                  size="sm"
                  fullWidth={false}
                  disabled={picker.busy}
                  onPress={picker.pickFromCamera}
                />
                <Button
                  title="Galería"
                  variant="secondary"
                  size="sm"
                  fullWidth={false}
                  disabled={picker.busy}
                  onPress={picker.pickFromGallery}
                />
              </div>
              {picker.error ? (
                <p className={styles.errorText} role="alert">
                  {picker.error}
                </p>
              ) : null}
              <p className={styles.helpText}>Podés agregar una foto después desde la ficha de la impresora</p>
            </div>
          </fieldset>
        ) : null}

        <TextField label="Nombre (opcional)" placeholder="Ej. PLA Rojo" error={errors.name?.message} {...register('name')} />
        <TextField label="Marca" placeholder="Ej. Prusa" error={errors.brand?.message} {...register('brand')} />
        <TextField label="Modelo" placeholder="Ej. i3 MK3S" error={errors.model?.message} {...register('model')} />
        <TextField
          label="Número de serie"
          placeholder="Número de serie"
          error={errors.serialNumber?.message}
          {...register('serialNumber')}
        />
        <TextField
          label="Ubicación (opcional)"
          placeholder="Ej. Laboratorio A"
          error={errors.location?.message}
          {...register('location')}
        />
        <TextField
          label="Fecha de compra"
          type="date"
          error={errors.purchaseDate?.message}
          {...register('purchaseDate')}
        />

        <Controller
          control={control}
          name="status"
          render={({ field: { onChange, value } }) => (
            <div className={styles.field} role="radiogroup" aria-labelledby="status-label">
              <span id="status-label" className={styles.label}>
                Estado inicial
              </span>
              <div className={styles.statusGroup}>
                {STATUS_OPTIONS.map((option) => {
                  const selected = value === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      className={cx(styles.statusOption, selected && styles.statusOptionSelected)}
                      onClick={() => onChange(option.value)}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
              {errors.status ? <p className={styles.errorText}>{errors.status.message}</p> : null}
            </div>
          )}
        />

        <Button title="Guardar Impresora" type="submit" loading={loading} className={styles.submit} />
      </form>
    </>
  );
}
