import { Plus, Trash2 } from 'lucide-react';
import { IconButton } from '../ui';
import { newExtraRow, num } from '../../utils/quoteForm';
import type { ExtraCostRow } from '../../utils/quoteForm';
import { formatMoney } from './money';
import styles from './ExtraCostsEditor.module.css';

// Atajos para los gastos más comunes en un trabajo de impresión.
const SUGGESTIONS = ['Rodamiento', 'Insertos roscados', 'Tornillería', 'Imanes', 'Pintura', 'Embalaje', 'Envío'];

interface Props {
  rows: ExtraCostRow[];
  readOnly: boolean;
  onChange: (rows: ExtraCostRow[]) => void;
}

// Gastos extra del presupuesto ("Rodamiento → $4.500"). Se cobran a costo: suman al total
// sin margen ni descuento, y salen como líneas propias en el PDF.
export default function ExtraCostsEditor({ rows, readOnly, onChange }: Props) {
  const total = rows.filter((r) => r.description.trim()).reduce((s, r) => s + num(r.amount), 0);
  const update = (key: string, patch: Partial<ExtraCostRow>) =>
    onChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const add = (description = '') => onChange([...rows, newExtraRow(description)]);
  const used = new Set(rows.map((r) => r.description.trim().toLowerCase()));

  return (
    <div className={styles.root}>
      {rows.length === 0 && (
        <p className={styles.empty}>
          Sumá repuestos o servicios que se cobran aparte, como rodamientos, insertos o el envío.
        </p>
      )}

      {rows.length > 0 && (
        <ul className={styles.list}>
          {rows.map((r, i) => (
            <li key={r.key} className={styles.row}>
              <label className={styles.srOnly} htmlFor={`extra-desc-${r.key}`}>
                Concepto del gasto {i + 1}
              </label>
              <input
                id={`extra-desc-${r.key}`}
                className={styles.desc}
                value={r.description}
                placeholder="Concepto (ej. Rodamiento 608ZZ)"
                readOnly={readOnly}
                maxLength={255}
                onChange={(e) => update(r.key, { description: e.target.value })}
              />
              <div className={styles.amountWrap}>
                <span className={styles.currency} aria-hidden="true">$</span>
                <label className={styles.srOnly} htmlFor={`extra-amount-${r.key}`}>
                  Importe del gasto {i + 1}
                </label>
                <input
                  id={`extra-amount-${r.key}`}
                  className={styles.amount}
                  value={r.amount}
                  inputMode="decimal"
                  placeholder="0"
                  readOnly={readOnly}
                  aria-invalid={r.description.trim() !== '' && r.amount.trim() !== '' && !(num(r.amount) >= 0)}
                  onChange={(e) => update(r.key, { amount: e.target.value })}
                />
              </div>
              {!readOnly && (
                <IconButton
                  icon={<Trash2 size={17} aria-hidden="true" />}
                  label={`Quitar ${r.description || 'gasto'}`}
                  variant="danger"
                  size="sm"
                  onPress={() => onChange(rows.filter((x) => x.key !== r.key))}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      {!readOnly && (
        <div className={styles.actions}>
          <button type="button" className={styles.add} onClick={() => add()}>
            <Plus size={16} aria-hidden="true" /> Agregar gasto
          </button>
          <div className={styles.suggestions} aria-label="Gastos frecuentes">
            {SUGGESTIONS.filter((s) => !used.has(s.toLowerCase())).slice(0, 5).map((s) => (
              <button key={s} type="button" className={styles.suggestion} onClick={() => add(s)}>
                + {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {rows.length > 0 && (
        <p className={styles.total}>
          <span>Total gastos extra</span>
          <strong>{formatMoney(total)}</strong>
        </p>
      )}
    </div>
  );
}
