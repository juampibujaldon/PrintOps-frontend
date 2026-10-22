// src/components/StatusTimeline.tsx
import { ORDER_STATUS } from '../constants/orders';
import type { StatusHistory } from '../services/orderService';
import { formatTimestamp } from '../utils/formatDate';
import { cx } from '../utils/cx';
import styles from './StatusTimeline.module.css';

// Etiquetas legibles para los roles del proyecto (US-05).
const ROLE_LABELS: Record<string, string> = {
  MANAGER: 'Supervisor',
  TECNICO: 'Técnico',
};

type Props = {
  history: StatusHistory[];
};

// Timeline vertical reutilizable de cambios de estado.
// El primer ítem (más reciente) tiene el dot pulsante.
export default function StatusTimeline({ history }: Props) {
  if (history.length === 0) {
    return <p className={styles.empty}>Sin cambios registrados</p>;
  }

  return (
    <ol>
      {history.map((item, index) => (
        <TimelineItem key={item.id} item={item} isLatest={index === 0} isLast={index === history.length - 1} />
      ))}
    </ol>
  );
}

function TimelineItem({ item, isLatest, isLast }: { item: StatusHistory; isLatest: boolean; isLast: boolean }) {
  const status = ORDER_STATUS[item.toStatus];
  const color = status?.color ?? '#AEAEB2';
  const label = status?.label ?? item.toStatus;
  const roleLabel = item.changedByRole ? (ROLE_LABELS[item.changedByRole] ?? item.changedByRole) : undefined;
  const actor = item.changedByName ?? 'Sistema';

  return (
    <li className={styles.row}>
      <div className={styles.timelineColumn} aria-hidden="true">
        <span className={cx(styles.dot, isLatest && styles.dotLatest)} style={{ backgroundColor: color }} />
        {!isLast ? <span className={styles.line} /> : null}
      </div>
      <div className={cx(styles.content, !isLast && styles.contentSpaced)}>
        <p className={styles.status}>{label}</p>
        <p className={styles.meta}>
          {formatTimestamp(item.changedAt)} · {actor}
          {roleLabel ? ` (${roleLabel})` : ''}
        </p>
        {item.comment ? (
          <blockquote className={styles.commentBox}>
            <p className={styles.commentText}>&ldquo;{item.comment}&rdquo;</p>
          </blockquote>
        ) : null}
      </div>
    </li>
  );
}
