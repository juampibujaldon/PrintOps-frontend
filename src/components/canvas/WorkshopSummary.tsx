import { AlertTriangle, CheckCircle2, ClipboardList, Wrench, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Colors, tint } from '../../constants/theme';
import { cx } from '../../utils/cx';
import PressableScale from '../ui/PressableScale';
import styles from './WorkshopSummary.module.css';

export type WorkshopFilter = 'OPERATIVE' | 'MAINTENANCE' | 'OUT_OF_SERVICE' | 'DUE' | 'ORDERS';

export interface WorkshopCounts {
  operative: number;
  maintenance: number;
  outOfService: number;
  due: number; // mantenimiento vencido o en los próximos 7 días
  openOrders: number;
}

interface Props {
  counts: WorkshopCounts;
  active: WorkshopFilter | null;
  onSelect: (filter: WorkshopFilter | null) => void;
}

// Tarjetas de resumen del taller. Tocar una resalta en el plano/lista las
// impresoras que coinciden; tocarla de nuevo quita el filtro.
export default function WorkshopSummary({ counts, active, onSelect }: Props) {
  const cards: { key: WorkshopFilter; label: string; value: number; color: string; Icon: LucideIcon }[] = [
    { key: 'OPERATIVE', label: 'Operativas', value: counts.operative, color: Colors.statusOperativa, Icon: CheckCircle2 },
    { key: 'MAINTENANCE', label: 'En mantenimiento', value: counts.maintenance, color: Colors.statusMantenim, Icon: Wrench },
    { key: 'OUT_OF_SERVICE', label: 'Fuera de servicio', value: counts.outOfService, color: Colors.statusFuera, Icon: XCircle },
    { key: 'DUE', label: 'Mant. pendiente', value: counts.due, color: Colors.statusFuera, Icon: AlertTriangle },
    { key: 'ORDERS', label: 'Órdenes abiertas', value: counts.openOrders, color: Colors.primary, Icon: ClipboardList },
  ];

  return (
    <div className={styles.row} role="group" aria-label="Resumen del taller">
      {cards.map(({ key, label, value, color, Icon }) => {
        const selected = active === key;
        return (
          <PressableScale
            key={key}
            onPress={() => onSelect(selected ? null : key)}
            className={cx(styles.card, selected && styles.selected)}
            style={selected ? { borderColor: color, backgroundColor: tint(color, 0.08) } : undefined}
            aria-pressed={selected}
            aria-label={`${label}: ${value}`}
          >
            <span className={styles.cardTop}>
              <span className={styles.iconWrap} style={{ backgroundColor: tint(color, 0.14) }}>
                <Icon color={color} size={18} strokeWidth={2} />
              </span>
              <span className={cx(styles.value, value === 0 && styles.valueZero)}>{value}</span>
            </span>
            <span className={styles.label}>{label}</span>
          </PressableScale>
        );
      })}
    </div>
  );
}
