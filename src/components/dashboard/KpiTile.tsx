import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { cx } from '../../utils/cx';
import { computeDelta } from './kpiDelta';
import styles from './KpiTile.module.css';

interface Props {
  label: string;
  value: string;
  // Valores numéricos del período actual y anterior para calcular la variación.
  current?: number | null;
  previous?: number | null;
  // true si subir es malo (p. ej. costos): invierte el color de la variación.
  invert?: boolean;
  // Variación en puntos porcentuales en vez de % relativo (p. ej. disponibilidad).
  deltaInPoints?: boolean;
  hint?: string;
  tone?: 'default' | 'danger';
}

export default function KpiTile({ label, value, current, previous, invert, deltaInPoints, hint, tone = 'default' }: Props) {
  const delta = computeDelta(current, previous, deltaInPoints);

  return (
    <div className={cx(styles.tile, tone === 'danger' && styles.danger)}>
      <p className={styles.label}>{label}</p>
      <p className={styles.value}>{value}</p>
      {delta ? <DeltaBadge delta={delta.value} text={delta.text} invert={invert} /> : <p className={styles.hint}>{hint ?? ' '}</p>}
    </div>
  );
}

function DeltaBadge({ delta, text, invert }: { delta: number; text: string; invert?: boolean }) {
  const flat = Math.abs(delta) < 0.5;
  const good = invert ? delta < 0 : delta > 0;
  const color = flat ? 'var(--color-text-secondary)' : good ? 'var(--color-success-text)' : 'var(--color-error-text)';
  const Icon = delta >= 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <p className={styles.deltaRow}>
      {!flat && <Icon size={13} strokeWidth={2.5} color={color} aria-hidden="true" />}
      <span className={styles.delta} style={{ color }}>
        {text}
      </span>
      <span className={styles.deltaHint}>&nbsp;vs. anterior</span>
    </p>
  );
}
