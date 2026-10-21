import Button from './Button';
import Modal from './Modal';
import styles from './ConfirmDialog.module.css';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Botón de confirmar en rojo (acciones destructivas). */
  destructive?: boolean;
  /** Solo botón de aceptar (equivale a Alert.alert simple). */
  hideCancel?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Aceptar',
  cancelLabel = 'Cancelar',
  destructive = false,
  hideCancel = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      alert
      hideCloseButton
      dismissible={!hideCancel}
      footer={
        <>
          {hideCancel ? null : <Button title={cancelLabel} variant="secondary" fullWidth={false} size="sm" onPress={onCancel} />}
          <Button
            title={confirmLabel}
            variant={destructive ? 'danger' : 'primary'}
            fullWidth={false}
            size="sm"
            onPress={onConfirm}
            data-autofocus
          />
        </>
      }
    >
      {message ? <p className={styles.message}>{message}</p> : null}
    </Modal>
  );
}
