// src/components/PrinterSelector.tsx
import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { Button, Modal, SelectField, Spinner } from './ui';
import { printerService } from '../services/printerService';
import type { PrinterResponse, PrinterStatus } from '../services/printerService';
import { cx } from '../utils/cx';
import styles from './PrinterSelector.module.css';

type Props = {
  selected: PrinterResponse | null;
  onSelect: (printer: PrinterResponse | null) => void;
  /** Solo lectura (p. ej. presupuestos que ya no son borrador). */
  disabled?: boolean;
  label?: string;
};

const STATUS_LABELS: Record<PrinterStatus, string> = {
  OPERATIVE: 'Operativa',
  MAINTENANCE: 'En mantenimiento',
  OUT_OF_SERVICE: 'Fuera de servicio',
};

// Selector de impresora en un Modal. Solo se pueden elegir impresoras operativas.
export default function PrinterSelector({ selected, onSelect, disabled = false, label = 'Impresora (opcional)' }: Props) {
  const [visible, setVisible] = useState(false);
  const [printers, setPrinters] = useState<PrinterResponse[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setLoading(true);
    printerService
      .getAllPrinters()
      .then((ps) => !cancelled && setPrinters(ps))
      .catch(() => !cancelled && setPrinters([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [visible]);

  const choose = (p: PrinterResponse | null) => {
    onSelect(p);
    setVisible(false);
  };

  return (
    <>
      <SelectField
        label={label}
        value={selected ? selected.name || selected.model : 'Sin impresora seleccionada'}
        disabled={disabled}
        onPress={() => setVisible(true)}
      />

      <Modal
        open={visible}
        onClose={() => setVisible(false)}
        title="Seleccionar impresora"
        footer={
          <div className={styles.footer}>
            <Button title="Sin impresora" variant="tinted" onPress={() => choose(null)} />
            <Button title="Cerrar" variant="ghost" onPress={() => setVisible(false)} />
          </div>
        }
      >
        {loading ? (
          <div className={styles.loading}>
            <Spinner size={28} />
          </div>
        ) : printers.length === 0 ? (
          <p className={styles.empty}>No hay impresoras para mostrar.</p>
        ) : (
          <ul className={styles.list}>
            {printers.map((item) => {
              const selectable = item.status === 'OPERATIVE';
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={cx(styles.row, !selectable && styles.rowDisabled)}
                    disabled={!selectable}
                    aria-pressed={selected?.id === item.id}
                    onClick={() => choose(item)}
                  >
                    <span className={styles.rowInfo}>
                      <span className={styles.rowName}>{item.name || item.model}</span>
                      <span className={styles.rowMeta}>
                        {item.brand} · {item.model}
                      </span>
                      <span className={styles.rowMeta}>
                        Estado: {STATUS_LABELS[item.status]} ·{' '}
                        {item.totalPrintingHours != null ? `${item.totalPrintingHours} hs` : '0 hs'}
                      </span>
                    </span>
                    {selectable ? (
                      <Check size={20} className={styles.ok} aria-label="Disponible" />
                    ) : (
                      <X size={20} className={styles.no} aria-label="No disponible" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Modal>
    </>
  );
}
