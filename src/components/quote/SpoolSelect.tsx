import { useEffect, useState } from 'react';
import { spoolService } from '../../services/spoolService';
import type { FilamentSpool } from '../../api/types';
import styles from './SpoolSelect.module.css';

interface Props {
  value: number | null;
  disabled?: boolean;
  onChange: (spool: FilamentSpool | null) => void;
}

// Bobina de la que sale el filamento: define el precio por gramo real y se descuenta al
// terminar el trabajo de impresión.
export default function SpoolSelect({ value, disabled, onChange }: Props) {
  const [spools, setSpools] = useState<FilamentSpool[]>([]);

  useEffect(() => {
    spoolService.list(false).then(setSpools).catch(() => setSpools([]));
  }, []);

  const label = (s: FilamentSpool) =>
    `${s.material}${s.color ? ' ' + s.color : ''}${s.brand ? ' · ' + s.brand : ''} — ${Math.round(s.remainingGrams)} g · $${s.pricePerGram}/g`;

  return (
    <label className={styles.field}>
      <span className={styles.label}>Bobina de filamento (opcional)</span>
      <select
        className={styles.select}
        value={value ?? ''}
        disabled={disabled}
        onChange={(e) => {
          const id = e.target.value ? Number(e.target.value) : null;
          onChange(id != null ? spools.find((s) => s.id === id) ?? null : null);
        }}
      >
        <option value="">Sin bobina (precio manual)</option>
        {spools.map((s) => (
          <option key={s.id} value={s.id}>
            {label(s)}
            {s.low ? ' ⚠ queda poco' : ''}
          </option>
        ))}
      </select>
    </label>
  );
}
