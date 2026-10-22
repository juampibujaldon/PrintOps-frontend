import { useEffect, useState } from 'react';
import { Button, Modal, TextField } from './ui';
import { useToast } from '../context/ToastContext';
import { apiErrorMessage } from '../services/authService';
import { partService } from '../services/partService';
import type { MovementType, SparePartDTO } from '../types/parts';
import { cx } from '../utils/cx';
import styles from './StockAdjustmentModal.module.css';

const OPTIONS: { type: MovementType; label: string }[] = [
  { type: 'PURCHASE', label: 'Compra' },
  { type: 'RETURN', label: 'Devolución' },
  { type: 'ADJUSTMENT', label: 'Ajuste manual' },
];

type Props = {
  visible: boolean;
  part: SparePartDTO | null;
  initialType?: MovementType;
  onClose: () => void;
  onAdjusted: (part: SparePartDTO) => void;
};

export default function StockAdjustmentModal({ visible, part, initialType = 'PURCHASE', onClose, onAdjusted }: Props) {
  const { showToast } = useToast();
  const [type, setType] = useState<MovementType>('PURCHASE');
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setType(initialType);
      setQuantity('');
      setNote('');
    }
  }, [visible, initialType]);

  if (!part) return null;

  const qty = Number(quantity) || 0;
  const isAdjustment = type === 'ADJUSTMENT';
  const newStock = isAdjustment ? qty : part.stock + qty;

  const confirm = async () => {
    if (qty <= 0) {
      showToast('Ingresá una cantidad mayor a 0.', { type: 'error', title: 'Atención' });
      return;
    }
    if (isAdjustment && !note.trim()) {
      showToast('La nota es obligatoria para un ajuste manual.', { type: 'error', title: 'Atención' });
      return;
    }
    setSaving(true);
    try {
      const updated = await partService.updateStock(part.id, type, qty, note.trim() || undefined);
      onAdjusted(updated);
      onClose();
    } catch (e) {
      showToast(apiErrorMessage(e, 'No se pudo ajustar el stock.'), { type: 'error', title: 'Error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={visible}
      onClose={onClose}
      title="Ajustar stock"
      size="sm"
      footer={
        <div className={styles.actions}>
          <Button variant="ghost" title="Cancelar" onPress={onClose} />
          <Button title="Confirmar" onPress={confirm} loading={saving} />
        </div>
      }
    >
      <p className={styles.partName}>{part.name}</p>

      <div role="group" aria-labelledby="movement-type-label">
        <p id="movement-type-label" className={styles.label}>
          Tipo de movimiento
        </p>
        <div className={styles.optionRow}>
          {OPTIONS.map((o) => (
            <button
              key={o.type}
              type="button"
              aria-pressed={type === o.type}
              className={cx(styles.option, type === o.type && styles.optionSelected)}
              onClick={() => setType(o.type)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.fields}>
        <TextField
          label={isAdjustment ? 'Nuevo stock' : 'Cantidad a ingresar'}
          value={quantity}
          onChangeText={setQuantity}
          inputMode="numeric"
          placeholder="0"
          data-autofocus
        />
        <TextField
          label={isAdjustment ? 'Nota (obligatoria)' : 'Nota (opcional)'}
          value={note}
          onChangeText={setNote}
          placeholder="Motivo del ajuste..."
        />
      </div>

      <p className={styles.preview}>
        Stock actual: {part.stock} → Stock nuevo: {newStock}
      </p>
    </Modal>
  );
}
