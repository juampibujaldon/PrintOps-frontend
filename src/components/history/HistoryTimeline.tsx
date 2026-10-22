// src/components/history/HistoryTimeline.tsx
import type { ReactNode } from 'react';
import { ORDER_STATUS, ORDER_TYPE } from '../../constants/orders';
import type { OrderHistoryItem } from '../../types/printerHistory';
import { formatOrderDate } from '../../utils/orderDate';
import { Badge, Button } from '../ui';
import styles from './HistoryTimeline.module.css';

function formatMoney(value: number): string {
  return `$${value.toFixed(2)}`;
}

interface HistoryItemProps {
  order: OrderHistoryItem;
  isLast: boolean;
  onPress: (orderId: number) => void;
}

export function HistoryItem({ order, isLast, onPress }: HistoryItemProps) {
  const typeMeta = ORDER_TYPE[order.type];
  const statusMeta = ORDER_STATUS[order.status];

  const metaParts = [formatOrderDate(order.createdAt)];
  if (order.actualMinutes != null) metaParts.push(`${order.actualMinutes} min`);
  if (order.technicianName) metaParts.push(order.technicianName);

  return (
    <li className={styles.itemRow}>
      <div className={styles.timelineColumn} aria-hidden="true">
        <span className={styles.dot} style={{ backgroundColor: typeMeta.color }} />
        {!isLast ? <span className={styles.connector} /> : null}
      </div>

      <article className={styles.itemContent}>
        <div className={styles.itemHeader}>
          <Badge label={typeMeta.label} color={typeMeta.color} />
          <Badge label={statusMeta.label} color={statusMeta.color} />
        </div>

        <p className={styles.meta}>{metaParts.join(' · ')}</p>

        {order.description ? (
          <p className={styles.description}>
            {typeMeta.label} — {order.description}
          </p>
        ) : null}

        {order.partsUsed.length > 0 ? (
          <div className={styles.partsSection}>
            <p className={styles.partsTitle}>Piezas:</p>
            {order.partsUsed.map((p, i) => (
              <p key={i} className={styles.partLine}>
                {p.partName} × {p.quantity} · {formatMoney(p.unitCost)}
              </p>
            ))}
            {order.partsCost > 0 ? <p className={styles.partsTotal}>Total piezas: {formatMoney(order.partsCost)}</p> : null}
          </div>
        ) : null}

        {order.photoUrls.length > 0 ? (
          <div className={styles.photosRow}>
            <div className={styles.thumbs}>
              {order.photoUrls.map((url, i) => (
                <img key={i} src={url} alt="" className={styles.thumbnail} loading="lazy" />
              ))}
            </div>
            <span className={styles.photoCount}>
              {order.photoUrls.length} foto{order.photoUrls.length > 1 ? 's' : ''}
            </span>
          </div>
        ) : null}

        <div className={styles.itemFooter}>
          <span className={styles.orderNumber}>{order.orderNumber}</span>
          <button
            type="button"
            className={styles.detailLink}
            onClick={() => onPress(order.id)}
            aria-label={`Ver detalle de ${order.orderNumber}`}
          >
            Ver detalle
          </button>
        </div>
      </article>
    </li>
  );
}

interface HistoryTimelineProps {
  orders: OrderHistoryItem[];
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  onPressOrder: (orderId: number) => void;
  empty?: ReactNode;
}

// Timeline vertical de órdenes (US-historial) con botón "Cargar más".
export default function HistoryTimeline({
  orders,
  hasMore,
  isLoadingMore,
  onLoadMore,
  onPressOrder,
  empty,
}: HistoryTimelineProps) {
  if (orders.length === 0) return <>{empty}</>;

  return (
    <>
      <ul className={styles.list}>
        {orders.map((order, index) => (
          <HistoryItem key={order.id} order={order} isLast={index === orders.length - 1} onPress={onPressOrder} />
        ))}
      </ul>
      {hasMore ? (
        <div className={styles.more}>
          <Button
            title="Cargar más"
            variant="secondary"
            fullWidth={false}
            loading={isLoadingMore}
            onPress={onLoadMore}
          />
        </div>
      ) : null}
    </>
  );
}
