import { MoreHorizontal } from 'lucide-react';
import type { SparePartDTO } from '../types/parts';
import styles from './SparePartCard.module.css';

// Tarjeta de repuesto en el inventario (US-10).
export default function SparePartCard({
  part,
  onMenuPress,
  onPress,
}: {
  part: SparePartDTO;
  onMenuPress: () => void;
  onPress: () => void;
}) {
  const pct = part.minStock > 0 ? Math.min(100, (part.stock / part.minStock) * 100) : 100;
  const barColor = part.isLowStock ? 'var(--color-status-fuera)' : 'var(--color-status-operativa)';

  return (
    <article className={styles.card}>
      <button type="button" className={styles.main} onClick={onPress} aria-label={`${part.name}, ver detalle`}>
        <span className={styles.topRow}>
          <span className={styles.info}>
            <span className={styles.nameRow}>
              <span className={styles.name}>{part.name}</span>
              {part.isOutOfStock ? <span className={styles.outBadge}>SIN STOCK</span> : null}
            </span>
            <span className={styles.partNumber}>Parte: {part.partNumber}</span>
            <span className={styles.price}>${part.unitPrice.toFixed(2)}</span>
          </span>
          {part.category ? <span className={styles.categoryChip}>{part.category}</span> : null}
        </span>

        <span className={styles.stockRow}>
          <span className={styles.stockLabel}>
            stock: {part.stock} / mín: {part.minStock}
          </span>
          <span className={styles.stockPct} style={{ color: barColor }}>
            {Math.round(pct)}%
          </span>
        </span>
        <span className={styles.track}>
          <span className={styles.fill} style={{ width: `${pct}%`, background: barColor }} />
        </span>
      </button>

      <button type="button" className={styles.menuBtn} onClick={onMenuPress} aria-label={`Acciones de ${part.name}`} aria-haspopup="dialog">
        <MoreHorizontal size={20} aria-hidden="true" />
      </button>
    </article>
  );
}
