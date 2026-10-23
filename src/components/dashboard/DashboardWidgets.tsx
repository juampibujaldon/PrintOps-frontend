// Piezas del dashboard (bloques y gráficos chicos), separadas de la pantalla.
import { ChevronRight } from 'lucide-react';
import { cx } from '../../utils/cx';
import DashCard from './DashCard';
import styles from '../../screens/DashboardScreen.module.css';

const money = (v: number) => `$${Math.round(v).toLocaleString('es-AR')}`;
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

// ─── Bloques auxiliares ──────────────────────────────────────────────────────
export function InlineStat({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return (
    <button type="button" className={styles.inlineStat} onClick={onPress}>
      <span className={styles.inlineValue}>{value}</span>
      <span className={styles.inlineLabel}>{label}</span>
    </button>
  );
}

export function Legend({ parts }: { parts: { label: string; value: number; color: string }[] }) {
  return (
    <ul className={styles.legend}>
      {parts.map((p) => (
        <li key={p.label} className={styles.legendText}>
          <span className={styles.legendDot} style={{ color: p.color }} aria-hidden="true">
            ●
          </span>{' '}
          {p.value} {p.label.toLowerCase()}
        </li>
      ))}
    </ul>
  );
}

export function StackBar({ parts }: { parts: { label: string; value: number; color: string }[] }) {
  return (
    <div className={styles.stackBar} aria-hidden="true">
      {parts
        .filter((p) => p.value > 0)
        .map((p) => (
          <span key={p.label} style={{ flex: p.value, background: p.color }} />
        ))}
    </div>
  );
}

// Embudo de presupuestos del período: aceptados / esperando / rechazados / borradores.
export function FunnelBar({ total, paid, accepted, pending, rejected }: { total: number; paid: number; accepted: number; pending: number; rejected: number }) {
  const drafts = Math.max(0, total - paid - accepted - pending - rejected);
  const parts = [
    { label: 'Pagados', value: paid, color: 'var(--color-success-text)' },
    { label: 'Aceptados', value: accepted, color: 'var(--color-status-operativa)' },
    { label: 'Enviados', value: pending, color: 'var(--color-primary)' },
    { label: 'Rechazados', value: rejected, color: 'var(--color-status-fuera)' },
    { label: 'Borradores', value: drafts, color: 'var(--color-text-tertiary)' },
  ];
  return (
    <div className={styles.funnel}>
      <StackBar parts={parts} />
      <Legend parts={parts} />
    </div>
  );
}

export function NetResult({ profit, maintenanceCost }: { profit: number; maintenanceCost: number }) {
  const net = profit - maintenanceCost;
  const positive = net >= 0;
  return (
    <div className={cx(styles.netBox, positive ? styles.netPositive : styles.netNegative)}>
      <div className={styles.netTexts}>
        <p className={styles.netLabel}>Resultado neto</p>
        <p className={styles.netFormula}>
          Ganancia de presupuestos {money(profit)} − mantenimiento {money(maintenanceCost)}
        </p>
      </div>
      <p className={styles.netValue}>
        {positive ? '' : '−'}
        {money(Math.abs(net))}
      </p>
    </div>
  );
}

// Proporción preventivo vs. correctivo: mucho correctivo = se está apagando incendios.
export function TypeMix({ preventive, corrective, calibration }: { preventive: number; corrective: number; calibration: number }) {
  const total = preventive + corrective + calibration;
  if (total === 0) return null;
  const correctivePct = Math.round((corrective / total) * 100);
  const parts = [
    { label: 'Preventivo', value: preventive, color: 'var(--color-status-operativa)' },
    { label: 'Calibración', value: calibration, color: 'var(--color-primary)' },
    { label: 'Correctivo', value: corrective, color: 'var(--color-status-fuera)' },
  ];
  return (
    <div className={styles.chartBlock}>
      <h3 className={styles.blockTitle}>Tipo de órdenes</h3>
      <StackBar parts={parts} />
      <Legend parts={parts} />
      {correctivePct >= 50 && (
        <p className={styles.insight}>
          El {correctivePct}% de las órdenes fueron correctivas: conviene reforzar el mantenimiento preventivo.
        </p>
      )}
    </div>
  );
}

export function ProblemPrinters({
  failing,
  availability,
  onPress,
}: {
  failing: { id: number; name: string; correctiveCount: number; totalCost: number }[];
  availability: { id: number; name: string; availabilityPercent: number }[];
  onPress: (id: number) => void;
}) {
  const lowAvailability = [...availability]
    .filter((p) => p.availabilityPercent < 90)
    .sort((a, b) => a.availabilityPercent - b.availabilityPercent)
    .slice(0, 3);

  if (failing.length === 0 && lowAvailability.length === 0) return null;

  return (
    <DashCard title="Impresoras a revisar" subtitle="Más fallas y menor disponibilidad del período" className={styles.wide}>
      <ul>
        {failing.map((f) => (
          <li key={`f-${f.id}`}>
            <button type="button" className={styles.problemRow} onClick={() => onPress(f.id)}>
              <span className={styles.problemDot} style={{ background: 'var(--color-status-fuera)' }} aria-hidden="true" />
              <span className={styles.problemTexts}>
                <span className={styles.problemName}>{f.name}</span>
                <span className={styles.problemDetail}>
                  {plural(f.correctiveCount, 'falla', 'fallas')} · {money(f.totalCost)} en reparaciones
                </span>
              </span>
              <ChevronRight size={18} className={styles.chevron} aria-hidden="true" />
            </button>
          </li>
        ))}
        {lowAvailability
          .filter((p) => !failing.some((f) => f.id === p.id))
          .map((p) => (
            <li key={`a-${p.id}`}>
              <button type="button" className={styles.problemRow} onClick={() => onPress(p.id)}>
                <span className={styles.problemDot} style={{ background: 'var(--color-status-mantenim)' }} aria-hidden="true" />
                <span className={styles.problemTexts}>
                  <span className={styles.problemName}>{p.name}</span>
                  <span className={styles.problemDetail}>Disponibilidad {p.availabilityPercent.toFixed(0)}%</span>
                </span>
                <ChevronRight size={18} className={styles.chevron} aria-hidden="true" />
              </button>
            </li>
          ))}
      </ul>
    </DashCard>
  );
}
