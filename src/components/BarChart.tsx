// src/components/BarChart.tsx
import { useState } from 'react';
import type { MonthlyCostDTO } from '../types/dashboard';
import { cx } from '../utils/cx';
import { money, moneyExact, shortMonth } from './barChartFormat';
import styles from './BarChart.module.css';

// Gráfico de barras de costos por mes (US-08). Solo DOM/CSS (sin librerías):
// barras en el color de acento, eje Y en $ y valor exacto al seleccionar una barra.
export default function BarChart({ data }: { data: MonthlyCostDTO[] }) {
  const [selected, setSelected] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return <p className={styles.empty}>Sin datos de costos</p>;
  }
  const max = Math.max(1, ...data.map((d) => d.cost));

  return (
    <div className={styles.chartRow}>
      <div className={styles.yAxis} aria-hidden="true">
        <span>{money(max)}</span>
        <span>{money(max / 2)}</span>
        <span>$0</span>
      </div>
      <div className={styles.bars}>
        {data.map((d, i) => {
          const pct = (d.cost / max) * 100;
          const isSel = selected === i;
          return (
            <button
              key={d.month}
              type="button"
              className={styles.barCol}
              aria-pressed={isSel}
              aria-label={`${shortMonth(d.month)} ${d.month.split('-')[0]}: ${moneyExact(d.cost)}`}
              onClick={() => setSelected(isSel ? null : i)}
            >
              <span className={styles.tooltipSlot}>{isSel ? <span className={styles.tooltip}>{moneyExact(d.cost)}</span> : null}</span>
              <span className={styles.barTrack}>
                <span className={cx(styles.bar, isSel && styles.barSelected)} style={{ height: `${Math.max(pct, 3)}%` }} />
              </span>
              <span className={styles.xLabel}>{shortMonth(d.month)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
