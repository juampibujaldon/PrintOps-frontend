// src/components/home/FiltersBar.tsx
import { Search, XCircle } from 'lucide-react';
import type { PrinterStatus } from '../../services/printerService';
import { Chip } from '../ui';
import styles from './FiltersBar.module.css';

export type StatusFilter = 'ALL' | PrinterStatus;

type Props = {
  statusFilter: StatusFilter;
  onStatusFilter: (s: StatusFilter) => void;
  search: string;
  onSearch: (s: string) => void;
};

const CHIPS: { value: StatusFilter; label: string }[] = [
  { value: 'ALL', label: 'Todas' },
  { value: 'OPERATIVE', label: 'Operativas' },
  { value: 'MAINTENANCE', label: 'En mantenimiento' },
  { value: 'OUT_OF_SERVICE', label: 'Fuera de servicio' },
];

export default function FiltersBar({ statusFilter, onStatusFilter, search, onSearch }: Props) {
  return (
    <div className={styles.container}>
      <div className={styles.searchBox}>
        <Search size={16} className={styles.searchIcon} aria-hidden="true" />
        <input
          type="search"
          className={styles.searchInput}
          placeholder="Buscar"
          aria-label="Buscar impresoras"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          autoCorrect="off"
          autoCapitalize="none"
          autoComplete="off"
        />
        {search ? (
          <button type="button" className={styles.clear} onClick={() => onSearch('')} aria-label="Borrar búsqueda">
            <XCircle size={16} />
          </button>
        ) : null}
      </div>
      <div className={styles.chipsRow} role="group" aria-label="Filtrar por estado">
        {CHIPS.map((chip) => (
          <Chip
            key={chip.value}
            label={chip.label}
            selected={statusFilter === chip.value}
            onPress={() => onStatusFilter(chip.value)}
          />
        ))}
      </div>
    </div>
  );
}
