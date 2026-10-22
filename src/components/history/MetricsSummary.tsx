// src/components/history/MetricsSummary.tsx
import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { PrinterMetrics } from '../../types/printerHistory';
import { Card, Skeleton } from '../ui';
import styles from './MetricsSummary.module.css';

interface MetricsSummaryProps {
  metrics: PrinterMetrics | null;
  loading?: boolean;
  printerName: string;
  totalHours?: number | null;
}

function money(value: number): string {
  return `$${value.toFixed(2)}`;
}

// Panel colapsable con las métricas principales de la impresora (US-historial).
export default function MetricsSummary({ metrics, loading = false, printerName, totalHours }: MetricsSummaryProps) {
  const [expanded, setExpanded] = useState(true);

  if (loading && !metrics) {
    return (
      <Card className={styles.card} aria-busy="true">
        <Skeleton height={120} />
      </Card>
    );
  }
  if (!metrics) return null;

  return (
    <Card className={styles.card} padded={false}>
      <button
        type="button"
        className={styles.toggle}
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        aria-label={expanded ? 'Contraer métricas' : 'Expandir métricas'}
      >
        {expanded ? (
          <div className={styles.expanded}>
            <div className={styles.headerRow}>
              <span className={styles.title}>{printerName}</span>
              <ChevronDown size={20} className={styles.chevron} aria-hidden="true" />
            </div>

            <div className={styles.highlightRow}>
              <span className={styles.highlightValue}>{metrics.totalInterventions} intervenciones</span>
              <span className={styles.highlightValue}>{money(metrics.totalCost)} total</span>
            </div>

            <hr className={styles.divider} />

            <Row label="MTBF" value={metrics.mtbfDays == null ? 'sin datos suficientes' : `${metrics.mtbfDays} días entre fallas`} />
            <Row label="Preventivos" value={String(metrics.preventiveCount)} />
            <Row label="Correctivos" value={String(metrics.correctiveCount)} />
            <Row label="Calibraciones" value={String(metrics.calibrationCount)} />
            <Row
              label="Pieza más usada"
              value={
                metrics.mostReplacedPartName
                  ? `${metrics.mostReplacedPartName} (x${metrics.mostReplacedPartCount})`
                  : 'sin piezas'
              }
            />

            {totalHours != null ? <p className={styles.hours}>{totalHours} horas de impresión acumuladas</p> : null}
          </div>
        ) : (
          <div className={styles.collapsed}>
            <span className={styles.collapsedText}>
              {metrics.totalInterventions} intervenciones · {money(metrics.totalCost)} · MTBF{' '}
              {metrics.mtbfDays == null ? 's/d' : `${metrics.mtbfDays}d`}
            </span>
            <ChevronRight size={20} className={styles.chevron} aria-hidden="true" />
          </div>
        )}
      </button>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.row}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{value}</span>
    </div>
  );
}
