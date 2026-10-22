// src/components/WearIndicator.tsx
import styles from './WearIndicator.module.css';

type Props = {
  label: string;
  percent: number;
  hoursRemaining: number;
  critical: boolean;
};

// Color de la barra según el % usado (US-11).
function barColor(percent: number): string {
  if (percent >= 90) return '#FF3B30';
  if (percent >= 50) return '#FF9500';
  return '#34C759';
}

export default function WearIndicator({ label, percent, hoursRemaining, critical }: Props) {
  const clamped = Math.max(0, Math.min(100, percent));
  const color = barColor(percent);

  return (
    <div className={styles.container}>
      <div className={styles.row}>
        <span className={styles.label}>{label}</span>
        <span className={styles.meta}>
          {Math.round(percent)}% usado · {Math.round(hoursRemaining)} horas restantes
        </span>
      </div>

      <div
        className={styles.track}
        role="progressbar"
        aria-label={`Desgaste de ${label}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(clamped)}
      >
        <div className={styles.fill} style={{ width: `${clamped}%`, backgroundColor: color }} />
      </div>

      {critical ? (
        <div className={styles.criticalBanner} role="alert">
          <p className={styles.criticalText}>Cerca del límite. Considerá reemplazarla antes del próximo trabajo.</p>
        </div>
      ) : null}
    </div>
  );
}
