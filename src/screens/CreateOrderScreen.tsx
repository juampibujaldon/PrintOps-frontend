// src/screens/CreateOrderScreen.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Check, ImagePlus, Plus, X } from 'lucide-react';
import { orderService } from '../services/orderService';
import type { ChecklistItemInput, OrderType, PartInput } from '../services/orderService';
import type { PrinterResponse } from '../services/printerService';
import type { SparePartDTO } from '../types/parts';
import { PHOTO_MAX_COUNT } from '../constants/media';
import { storage } from '../services/storage';
import { useDraftAutosave } from '../hooks/useDraftAutosave';
import { usePhotoPicker } from '../hooks/usePhotoPicker';
import { useUploadsEnabled } from '../hooks/useUploadsEnabled';
import { usePrinterById } from '../hooks/usePrinterById';
import { useToast } from '../context/ToastContext';
import PartsSelectorModal from '../components/PartsSelectorModal';
import { Button, Card, ErrorState, Modal, ScreenHeader, Skeleton, TextField } from '../components/ui';
import { cx } from '../utils/cx';
import styles from './CreateOrderScreen.module.css';

const MAX_PHOTOS = PHOTO_MAX_COUNT;
const DRAFT_AUTOSAVE_MS = 30000;

const TYPE_LABELS: Record<OrderType, string> = {
  PREVENTIVE: 'Preventivo',
  CORRECTIVE: 'Correctivo',
  CALIBRATION: 'Calibración',
};

const DEFAULT_CHECKLISTS: Record<OrderType, string[]> = {
  PREVENTIVE: [
    'Limpieza de boquilla y hotend',
    'Lubricación de ejes X, Y, Z',
    'Verificación de tensión de correas',
    'Nivelación de cama',
    'Inspección de cables y conexiones',
    'Actualización de firmware (si aplica)',
  ],
  CORRECTIVE: [
    'Diagnóstico inicial',
    'Piezas inspeccionadas',
    'Piezas reemplazadas',
    'Prueba de funcionamiento post-reparación',
  ],
  CALIBRATION: [
    'Calibración de extrusor (pasos/mm)',
    'Calibración de temperatura de boquilla',
    'Calibración de cama (mesh bed leveling)',
    'Impresión de prueba y medición',
    'Criterios de aceptación detallados',
  ],
};

const toChecklist = (type: OrderType): ChecklistItemInput[] =>
  DEFAULT_CHECKLISTS[type].map((text) => ({ text, done: false, na: false }));

interface Draft {
  type: OrderType | null;
  description: string;
  checklist: ChecklistItemInput[];
  parts: PartInput[];
  estimatedTime: string;
}

// Lee el borrador guardado (localStorage). Un borrador corrupto se ignora.
function readDraft(key: string, forceCorrective: boolean): Draft {
  const base: Draft = {
    type: forceCorrective ? 'CORRECTIVE' : null,
    description: '',
    checklist: forceCorrective ? toChecklist('CORRECTIVE') : [],
    parts: [],
    estimatedTime: '',
  };
  const raw = storage.getItem(key);
  if (!raw) return base;
  try {
    const d = JSON.parse(raw) as Partial<Draft>;
    const next = { ...base };
    if (d.type && DEFAULT_CHECKLISTS[d.type]) next.type = d.type;
    if (d.description) next.description = d.description;
    if (Array.isArray(d.checklist) && d.checklist.length > 0) {
      next.checklist = d.checklist;
    } else if (d.type && DEFAULT_CHECKLISTS[d.type]) {
      next.checklist = toChecklist(d.type);
    }
    if (Array.isArray(d.parts)) next.parts = d.parts;
    if (d.estimatedTime) next.estimatedTime = String(d.estimatedTime);
    return next;
  } catch {
    return base;
  }
}

export default function CreateOrderScreen() {
  const { printerId, printer, loading, error, reload } = usePrinterById();
  const backTo = printerId != null ? `/printers/${printerId}` : '/printers';

  if (!printer) {
    return (
      <>
        <ScreenHeader title="Nueva orden" backTo={backTo} />
        {loading ? (
          <div aria-busy="true">
            <Skeleton height={60} className={styles.skeleton} />
            <Skeleton height={200} className={styles.skeleton} />
          </div>
        ) : (
          <ErrorState error={error ?? 'No se encontró la impresora.'} onRetry={() => void reload('initial')} />
        )}
      </>
    );
  }

  return <CreateOrderForm printer={printer} backTo={backTo} />;
}

function CreateOrderForm({ printer, backTo }: { printer: PrinterResponse; backTo: string }) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const forceCorrective = printer.status === 'OUT_OF_SERVICE';
  const draftKey = `@printops/order_draft_${printer.id ?? printer.serialNumber ?? 'noid'}`;

  const [initial] = useState(() => readDraft(draftKey, forceCorrective));
  const [step, setStep] = useState(1);
  const [type, setType] = useState<OrderType | null>(initial.type);
  const [description, setDescription] = useState(initial.description);
  const [checklist, setChecklist] = useState<ChecklistItemInput[]>(initial.checklist);
  const [parts, setParts] = useState<PartInput[]>(initial.parts);
  const [estimatedTime, setEstimatedTime] = useState(initial.estimatedTime);
  const [saving, setSaving] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [partsModalVisible, setPartsModalVisible] = useState(false);

  const picker = usePhotoPicker({ max: MAX_PHOTOS });
  const uploadsEnabled = useUploadsEnabled();

  useDraftAutosave(draftKey, { type, description, checklist, parts, estimatedTime }, DRAFT_AUTOSAVE_MS);

  const selectType = (t: OrderType) => {
    if (forceCorrective && t !== 'CORRECTIVE') return;
    setType(t);
    setChecklist((prev) => (prev.length === 0 ? toChecklist(t) : prev));
  };

  const canGoNext = () => {
    if (step === 1) {
      if (!type) return false;
      if (type === 'CORRECTIVE' && !description.trim()) return false;
    }
    return true;
  };

  const updateChecklistItem = (index: number, patch: Partial<ChecklistItemInput>) =>
    setChecklist((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  const addChecklistItem = () => setChecklist((prev) => [...prev, { text: '', done: false, na: false }]);
  const removeChecklistItem = (index: number) => setChecklist((prev) => prev.filter((_, i) => i !== index));

  const addCatalogPart = (part: SparePartDTO, quantity: number) =>
    setParts((prev) => [...prev, { partId: part.id, quantity }]);

  const addExternalPart = (name: string, partNumber: string, unitPrice: number, quantity: number) =>
    setParts((prev) => [
      ...prev,
      {
        quantity,
        externalPartName: name || null,
        externalPartNumber: partNumber || null,
        externalUnitPrice: unitPrice || null,
      },
    ]);

  const removePart = (index: number) => setParts((prev) => prev.filter((_, i) => i !== index));

  const handleSave = async () => {
    if (!type) return;
    setSaving(true);
    try {
      const data = {
        printerId: printer.id,
        type,
        description: description.trim() || null,
        estimatedTimeMinutes: estimatedTime ? parseInt(estimatedTime, 10) : null,
        checklistItems: checklist.filter((it) => it.text.trim()).map((it) => ({ ...it, text: it.text.trim() })),
        parts,
      };
      const order = await orderService.createOrder(data, picker.files);
      storage.removeItem(draftKey);
      navigate(`/orders/${order.id}`, { replace: true });
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast(message || 'No se pudo crear la orden', { type: 'error', title: 'Error' });
      setShowSummary(false);
    } finally {
      setSaving(false);
    }
  };

  const STEPS = ['Tipo', 'Checklist', uploadsEnabled ? 'Piezas/Fotos' : 'Piezas'];

  return (
    <>
      <ScreenHeader title="Nueva orden" subtitle={printer.name || printer.model} backTo={backTo} />

      <div className={styles.container}>
        <ol className={styles.stepper} aria-label="Pasos">
          {STEPS.map((label, i) => (
            <li
              key={label}
              className={styles.stepperStep}
              aria-current={step === i + 1 ? 'step' : undefined}
            >
              <span className={cx(styles.stepperDot, step >= i + 1 && styles.stepperDotActive)}>{i + 1}</span>
              <span className={cx(styles.stepperLabel, step >= i + 1 && styles.stepperLabelActive)}>{label}</span>
            </li>
          ))}
        </ol>

        {forceCorrective ? (
          <p className={styles.warning} role="status">
            Impresora fuera de servicio: la orden será Correctivo.
          </p>
        ) : null}

        {step === 1 ? (
          <section>
            <h2 className={styles.stepTitle}>Tipo de orden</h2>
            <div className={styles.typeGroup} role="radiogroup" aria-label="Tipo de orden">
              {(Object.keys(TYPE_LABELS) as OrderType[]).map((t) => {
                const disabled = forceCorrective && t !== 'CORRECTIVE';
                const selected = type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={disabled}
                    className={cx(styles.typeOption, selected && styles.typeOptionSelected)}
                    onClick={() => selectType(t)}
                  >
                    {TYPE_LABELS[t]}
                  </button>
                );
              })}
            </div>

            {type === 'CORRECTIVE' ? (
              <TextField
                label="Descripción del problema (obligatorio)"
                multiline
                placeholder="Describí el problema observado..."
                value={description}
                onChangeText={setDescription}
              />
            ) : null}
          </section>
        ) : null}

        {step === 2 ? (
          <section>
            {type !== 'CORRECTIVE' ? (
              <TextField
                label="Descripción (opcional)"
                multiline
                placeholder="Detalle del trabajo a realizar..."
                value={description}
                onChangeText={setDescription}
              />
            ) : null}

            <h2 className={styles.stepTitle}>Checklist</h2>
            <ul>
              {checklist.map((item, index) => (
                <li key={index} className={styles.checklistItem}>
                  <button
                    type="button"
                    className={cx(styles.checkToggle, item.done && styles.checkToggleDone)}
                    onClick={() => updateChecklistItem(index, { done: !item.done, na: false })}
                    aria-pressed={item.done}
                    aria-label={`Marcar como hecho: ${item.text || `ítem ${index + 1}`}`}
                  >
                    {item.done ? <Check size={16} strokeWidth={2.5} /> : null}
                  </button>
                  <TextField
                    aria-label={`Ítem ${index + 1}`}
                    containerClassName={styles.checklistField}
                    className={cx((item.done || item.na) && styles.checklistTextMuted)}
                    value={item.text}
                    onChangeText={(text) => updateChecklistItem(index, { text })}
                    placeholder="Ítem..."
                  />
                  <button
                    type="button"
                    className={cx(styles.naToggle, item.na && styles.naToggleActive)}
                    onClick={() => updateChecklistItem(index, { na: !item.na, done: false })}
                    aria-pressed={item.na}
                    aria-label="No aplica"
                  >
                    N/A
                  </button>
                  <button
                    type="button"
                    className={styles.iconBtn}
                    onClick={() => removeChecklistItem(index)}
                    aria-label="Quitar ítem"
                  >
                    <X size={18} />
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" className={styles.addItemButton} onClick={addChecklistItem}>
              <Plus size={18} aria-hidden="true" />
              Agregar ítem
            </button>
          </section>
        ) : null}

        {step === 3 ? (
          <section>
            <h2 className={styles.stepTitle}>Piezas reemplazadas</h2>
            <ul>
              {parts.map((p, index) => (
                <li key={index} className={styles.partRow}>
                  <span className={styles.partRowText}>
                    {p.partId ? `Pieza #${p.partId}` : p.externalPartName || p.externalPartNumber || 'Pieza externa'} ×{' '}
                    {p.quantity}
                  </span>
                  <button type="button" className={styles.iconBtn} onClick={() => removePart(index)} aria-label="Quitar pieza">
                    <X size={18} />
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" className={styles.addItemButton} onClick={() => setPartsModalVisible(true)}>
              <Plus size={18} aria-hidden="true" />
              Agregar pieza
            </button>

            {uploadsEnabled ? (
              <>
                <h2 className={styles.stepTitle}>
                  Fotos ({picker.photos.length}/{MAX_PHOTOS})
                </h2>
                <ul className={styles.photoGrid}>
                  {picker.photos.map((p) => (
                    <li key={p.id} className={styles.photoTile}>
                      <img src={p.previewUrl} alt="Foto de la orden" className={styles.photo} />
                      <button
                        type="button"
                        className={styles.photoRemove}
                        onClick={() => picker.remove(p.id)}
                        aria-label="Quitar foto"
                      >
                        <X size={14} strokeWidth={2.5} />
                      </button>
                    </li>
                  ))}
                </ul>
                {picker.error ? (
                  <p className={styles.errorText} role="alert">
                    {picker.error}
                  </p>
                ) : null}
                <div className={styles.photoActions}>
                  <Button
                    title="Cámara"
                    variant="secondary"
                    size="sm"
                    fullWidth={false}
                    icon={<Camera size={16} />}
                    disabled={picker.busy || picker.photos.length >= MAX_PHOTOS}
                    onPress={picker.pickFromCamera}
                  />
                  <Button
                    title="Galería"
                    variant="secondary"
                    size="sm"
                    fullWidth={false}
                    icon={<ImagePlus size={16} />}
                    disabled={picker.busy || picker.photos.length >= MAX_PHOTOS}
                    onPress={picker.pickFromGallery}
                  />
                </div>
              </>
            ) : null}

            <TextField
              label="Tiempo estimado (minutos)"
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="Ej: 45"
              value={estimatedTime}
              onChangeText={setEstimatedTime}
            />
          </section>
        ) : null}

        <div className={styles.footer}>
          {step > 1 ? (
            <Button variant="ghost" title="Anterior" fullWidth={false} onPress={() => setStep(step - 1)} />
          ) : null}
          {step < 3 ? (
            <Button title="Siguiente" fullWidth={false} onPress={() => setStep(step + 1)} disabled={!canGoNext()} />
          ) : (
            <Button title="Guardar" fullWidth={false} onPress={() => setShowSummary(true)} />
          )}
        </div>
      </div>

      <PartsSelectorModal
        visible={partsModalVisible}
        onClose={() => setPartsModalVisible(false)}
        onAddCatalog={addCatalogPart}
        onAddExternal={addExternalPart}
      />

      <Modal
        open={showSummary}
        onClose={() => !saving && setShowSummary(false)}
        title="Confirmar orden"
        size="sm"
        footer={
          <>
            <Button variant="ghost" title="Volver" fullWidth={false} disabled={saving} onPress={() => setShowSummary(false)} />
            <Button title="Confirmar" fullWidth={false} onPress={() => void handleSave()} loading={saving} />
          </>
        }
      >
        <Card padded={false} className={styles.summary}>
          <p className={styles.summaryLine}>Impresora: {printer.serialNumber}</p>
          <p className={styles.summaryLine}>Tipo: {type ? TYPE_LABELS[type] : '-'}</p>
          <p className={styles.summaryLine}>Ítems de checklist: {checklist.filter((it) => it.text.trim()).length}</p>
          <p className={styles.summaryLine}>Piezas: {parts.length}</p>
          {uploadsEnabled ? <p className={styles.summaryLine}>Fotos: {picker.photos.length}</p> : null}
          <p className={styles.summaryLine}>Tiempo estimado: {estimatedTime ? `${estimatedTime} min` : '-'}</p>
        </Card>
      </Modal>
    </>
  );
}
