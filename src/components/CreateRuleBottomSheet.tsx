// src/components/CreateRuleBottomSheet.tsx
// En web el bottom sheet es un Modal (en mobile se ve como hoja inferior).
import { useState } from 'react';
import type { FormEvent } from 'react';
import { X } from 'lucide-react';
import type { CreateRuleInput, MaintenanceRuleDTO, MaintenanceType, TriggerType } from '../types/rules';
import { ruleService } from '../services/ruleService';
import { useToast } from '../context/ToastContext';
import { Button, Modal, TextField } from './ui';
import { cx } from '../utils/cx';
import styles from './CreateRuleBottomSheet.module.css';

// Opciones de tipo de disparo (chips) con su unidad de umbral.
const TRIGGERS: { value: TriggerType; label: string; unit: string }[] = [
  { value: 'TIME_BASED', label: 'Por tiempo', unit: 'días' },
  { value: 'USAGE_HOURS', label: 'Por horas', unit: 'horas' },
  { value: 'FILAMENT_GRAMS', label: 'Por filamento', unit: 'gramos' },
];

const TYPES: { value: MaintenanceType; label: string }[] = [
  { value: 'PREVENTIVE', label: 'Preventivo' },
  { value: 'CORRECTIVE', label: 'Correctivo' },
  { value: 'CALIBRATION', label: 'Calibración' },
];

type Props = {
  visible: boolean;
  printerId: number;
  onClose: () => void;
  onCreated: (rule: MaintenanceRuleDTO) => void;
};

export default function CreateRuleBottomSheet({ visible, printerId, onClose, onCreated }: Props) {
  const { showToast } = useToast();
  const [triggerType, setTriggerType] = useState<TriggerType>('TIME_BASED');
  const [triggerValue, setTriggerValue] = useState('');
  const [maintenanceType, setMaintenanceType] = useState<MaintenanceType>('PREVENTIVE');
  const [alertDays, setAlertDays] = useState('7');
  const [checklist, setChecklist] = useState<string[]>([]);
  const [newItem, setNewItem] = useState('');
  const [loading, setLoading] = useState(false);

  const unit = TRIGGERS.find((t) => t.value === triggerType)?.unit ?? '';

  const addItem = () => {
    const text = newItem.trim();
    if (!text) return;
    setChecklist((prev) => [...prev, text]);
    setNewItem('');
  };

  const removeItem = (index: number) => setChecklist((prev) => prev.filter((_, i) => i !== index));

  const reset = () => {
    setTriggerType('TIME_BASED');
    setTriggerValue('');
    setMaintenanceType('PREVENTIVE');
    setAlertDays('7');
    setChecklist([]);
    setNewItem('');
  };

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    const value = Number(triggerValue);
    if (!value || value <= 0) {
      showToast('Ingresá un umbral válido mayor a 0.', { type: 'error', title: 'Error' });
      return;
    }

    const payload: CreateRuleInput = {
      printerId,
      triggerType,
      triggerValue: value,
      alertDaysBefore: Number(alertDays) || 7,
      maintenanceType,
      checklistItems: checklist,
    };

    setLoading(true);
    try {
      const created = await ruleService.createRule(payload);
      onCreated(created);
      reset();
      onClose();
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast(message || 'No se pudo crear la regla.', { type: 'error', title: 'Error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={visible}
      onClose={() => !loading && onClose()}
      title="Nueva regla"
      footer={<Button title="Crear regla" loading={loading} onPress={() => void submit()} />}
    >
      <form onSubmit={submit} noValidate>
        <span className={styles.label} id="rule-trigger-label">
          Disparador
        </span>
        <div className={styles.chipRow} role="group" aria-labelledby="rule-trigger-label">
          {TRIGGERS.map((t) => (
            <button
              key={t.value}
              type="button"
              className={cx(styles.chip, triggerType === t.value && styles.chipSelected)}
              aria-pressed={triggerType === t.value}
              onClick={() => setTriggerType(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <TextField
          label={`Umbral (${unit})`}
          placeholder={`Cantidad de ${unit}`}
          inputMode="decimal"
          value={triggerValue}
          onChangeText={setTriggerValue}
        />

        <span className={styles.label} id="rule-type-label">
          Tipo de mantenimiento
        </span>
        <div className={styles.chipRow} role="group" aria-labelledby="rule-type-label">
          {TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              className={cx(styles.chip, maintenanceType === t.value && styles.chipSelected)}
              aria-pressed={maintenanceType === t.value}
              onClick={() => setMaintenanceType(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <TextField
          label="Días de alerta previa"
          placeholder="7"
          inputMode="numeric"
          value={alertDays}
          onChangeText={setAlertDays}
        />

        <span className={styles.label}>Checklist</span>
        {checklist.length > 0 ? (
          <ul className={styles.list}>
            {checklist.map((item, index) => (
              <li key={index} className={styles.checklistItem}>
                <span className={styles.checklistText}>{item}</span>
                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={() => removeItem(index)}
                  aria-label={`Quitar ítem ${item}`}
                >
                  <X size={18} />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <div className={styles.addRow}>
          <TextField
            aria-label="Nuevo ítem"
            placeholder="Nuevo ítem"
            containerClassName={styles.addField}
            value={newItem}
            onChangeText={setNewItem}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addItem();
              }
            }}
          />
          <Button title="Agregar ítem" variant="tinted" fullWidth={false} onPress={addItem} className={styles.addBtn} />
        </div>
        {/* Permite enviar con Enter desde los demás campos. */}
        <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  );
}
