import { CheckCircle2, ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { tint } from '../../constants/theme';
import { cx } from '../../utils/cx';
import styles from './AttentionList.module.css';

export interface AttentionItem {
  key: string;
  Icon: LucideIcon;
  color: string;
  title: string;
  detail: string;
  count: number;
  onPress: () => void;
}

// Lista de cosas que requieren acción, ordenada por gravedad. Cada fila lleva
// a la pantalla donde se resuelve. Si no hay nada, lo dice claramente.
export default function AttentionList({ items }: { items: AttentionItem[] }) {
  if (items.length === 0) {
    return (
      <div className={styles.allGood}>
        <CheckCircle2 size={22} strokeWidth={2} className={styles.allGoodIcon} aria-hidden="true" />
        <div>
          <p className={styles.allGoodTitle}>Todo en orden</p>
          <p className={styles.allGoodText}>No hay órdenes vencidas, mantenimientos atrasados ni faltantes de stock.</p>
        </div>
      </div>
    );
  }

  return (
    <ul>
      {items.map((item, i) => (
        <li key={item.key} className={cx(i < items.length - 1 && styles.separator)}>
          <button
            type="button"
            className={styles.row}
            onClick={item.onPress}
            aria-label={`${item.title}: ${item.count}. ${item.detail}`}
          >
            <span className={styles.iconWrap} style={{ backgroundColor: tint(item.color, 0.14) }}>
              <item.Icon color={item.color} size={18} strokeWidth={2} aria-hidden="true" />
            </span>
            <span className={styles.texts}>
              <span className={styles.title}>{item.title}</span>
              <span className={styles.detail}>{item.detail}</span>
            </span>
            <span className={styles.count} style={{ backgroundColor: item.color }}>
              {item.count}
            </span>
            <ChevronRight size={18} className={styles.chevron} aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  );
}
