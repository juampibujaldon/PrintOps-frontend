import styles from './FleetStatus.module.css';

interface Props {
  operative: number;
  maintenance: number;
  outOfService: number;
  total: number;
}

// Barra apilada con el estado actual de todas las impresoras + leyenda.
export default function FleetStatus({ operative, maintenance, outOfService, total }: Props) {
  const segments = [
    { label: 'Operativas', value: operative, color: 'var(--color-status-operativa)' },
    { label: 'Mantenimiento', value: maintenance, color: 'var(--color-status-mantenim)' },
    { label: 'Fuera de servicio', value: outOfService, color: 'var(--color-status-fuera)' },
  ];
  const operativePct = total > 0 ? Math.round((operative / total) * 100) : 0;

  return (
    <div>
      <div className={styles.headline}>
        <span className={styles.big}>{operativePct}%</span>
        <span className={styles.bigLabel}>operativas ahora · {total} impresoras</span>
      </div>

      <div className={styles.bar} role="img" aria-label={segments.map((s) => `${s.value} ${s.label.toLowerCase()}`).join(', ')}>
        {total === 0 ? (
          <span className={styles.segment} style={{ flex: 1, background: 'var(--color-fill)' }} />
        ) : (
          segments
            .filter((s) => s.value > 0)
            .map((s) => <span key={s.label} className={styles.segment} style={{ flex: s.value, background: s.color }} />)
        )}
      </div>

      <ul className={styles.legend}>
        {segments.map((s) => (
          <li key={s.label} className={styles.legendItem}>
            <span className={styles.dot} style={{ background: s.color }} aria-hidden="true" />
            <span>
              <strong className={styles.legendValue}>{s.value}</strong> {s.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
