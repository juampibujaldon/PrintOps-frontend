// src/components/home/SummaryBar.tsx
import type { PrinterResponse } from '../../services/printerService';
import { Card } from '../ui';
import styles from './SummaryBar.module.css';

type Props = { printers: PrinterResponse[] };

export default function SummaryBar({ printers }: Props) {
  const counts = {
    total: printers.length,
    operativas: printers.filter((p) => p.status === 'OPERATIVE').length,
    mantenimiento: printers.filter((p) => p.status === 'MAINTENANCE').length,
    fuera: printers.filter((p) => p.status === 'OUT_OF_SERVICE').length,
  };

  return (
    <Card padded={false} className={styles.bar} role="group" aria-label="Resumen de impresoras">
      <Stat label="Total" value={counts.total} />
      <Stat label="Operativas" value={counts.operativas} dot="var(--color-green)" />
      <Stat label="Mantenim." value={counts.mantenimiento} dot="var(--color-orange)" />
      <Stat label="Fuera" value={counts.fuera} dot="var(--color-red)" />
    </Card>
  );
}

function Stat({ label, value, dot }: { label: string; value: number; dot?: string }) {
  return (
    <div className={styles.stat}>
      <span className={styles.value}>{value}</span>
      <span className={styles.labelRow}>
        {dot ? <span className={styles.dot} style={{ backgroundColor: dot }} aria-hidden="true" /> : null}
        <span className={styles.label}>{label}</span>
      </span>
    </div>
  );
}
