// src/components/history/HistoryFilters.tsx
import { X } from 'lucide-react';
import { ORDER_TYPE } from '../../constants/orders';
import type { OrderType } from '../../services/orderService';
import { cx } from '../../utils/cx';
import styles from './HistoryFilters.module.css';

interface HistoryFiltersProps {
  type: OrderType | null;
  from: string | null; // YYYY-MM-DD
  to: string | null; // YYYY-MM-DD
  onTypeChange: (type: OrderType | null) => void;
  onDateRangeChange: (from: string | null, to: string | null) => void;
}

const TYPE_OPTIONS: (OrderType | null)[] = [null, 'PREVENTIVE', 'CORRECTIVE', 'CALIBRATION'];

// Barra de filtros: chips de tipo (fila 1) y rango de fechas (fila 2).
export default function HistoryFilters({ type, from, to, onTypeChange, onDateRangeChange }: HistoryFiltersProps) {
  return (
    <div className={styles.container}>
      <div className={styles.chipsRow} role="group" aria-label="Filtrar por tipo">
        {TYPE_OPTIONS.map((option) => {
          const active = type === option;
          const label = option ? ORDER_TYPE[option].label : 'Todos';
          const color = option ? ORDER_TYPE[option].color : 'var(--color-text-primary)';
          return (
            <button
              key={option ?? 'todos'}
              type="button"
              className={cx(styles.chip, active && styles.chipActive)}
              style={active ? { backgroundColor: color, borderColor: color } : undefined}
              onClick={() => onTypeChange(option)}
              aria-pressed={active}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className={styles.dateRow}>
        <label className={styles.dateField}>
          <span className={styles.dateLabel}>Desde</span>
          <input
            type="date"
            className={styles.dateInput}
            value={from ?? ''}
            max={to ?? undefined}
            onChange={(e) => onDateRangeChange(e.target.value || null, to)}
          />
        </label>
        <label className={styles.dateField}>
          <span className={styles.dateLabel}>Hasta</span>
          <input
            type="date"
            className={styles.dateInput}
            value={to ?? ''}
            min={from ?? undefined}
            onChange={(e) => onDateRangeChange(from, e.target.value || null)}
          />
        </label>
        {from || to ? (
          <button type="button" className={styles.clear} onClick={() => onDateRangeChange(null, null)}>
            <X size={16} aria-hidden="true" />
            Quitar fechas
          </button>
        ) : (
          <span className={styles.hint}>Rango opcional</span>
        )}
      </div>
    </div>
  );
}
