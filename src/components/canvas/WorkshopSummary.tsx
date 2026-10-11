import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AlertTriangle, CheckCircle2, ClipboardList, Wrench, XCircle } from 'lucide-react-native';
import { Colors, Icons, Radius, Shadows, Spacing, Typography, tint } from '../../constants/theme';
import PressableScale from '../ui/PressableScale';

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
  const cards: { key: WorkshopFilter; label: string; value: number; color: string; Icon: typeof Wrench }[] = [
    { key: 'OPERATIVE', label: 'Operativas', value: counts.operative, color: Colors.statusOperativa, Icon: CheckCircle2 },
    { key: 'MAINTENANCE', label: 'En mantenimiento', value: counts.maintenance, color: Colors.statusMantenim, Icon: Wrench },
    { key: 'OUT_OF_SERVICE', label: 'Fuera de servicio', value: counts.outOfService, color: Colors.statusFuera, Icon: XCircle },
    { key: 'DUE', label: 'Mant. pendiente', value: counts.due, color: Colors.statusFuera, Icon: AlertTriangle },
    { key: 'ORDERS', label: 'Órdenes abiertas', value: counts.openOrders, color: Colors.primary, Icon: ClipboardList },
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.scroll}
    >
      {cards.map(({ key, label, value, color, Icon }) => {
        const selected = active === key;
        return (
          <PressableScale
            key={key}
            scaleTo={0.96}
            onPress={() => onSelect(selected ? null : key)}
            style={[styles.card, selected && { borderColor: color, backgroundColor: tint(color, 0.08) }]}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`${label}: ${value}`}
          >
            <View style={styles.cardTop}>
              <View style={[styles.iconWrap, { backgroundColor: tint(color, 0.14) }]}>
                <Icon color={color} size={Icons.sm} strokeWidth={2} />
              </View>
              <Text style={[styles.value, value === 0 && styles.valueZero]}>{value}</Text>
            </View>
            <Text style={styles.label} numberOfLines={2}>{label}</Text>
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0, marginHorizontal: -Spacing.md },
  // El padding vertical deja lugar a la sombra (si no, el ScrollView la recorta).
  row: { gap: Spacing.md, paddingHorizontal: Spacing.md, paddingTop: Spacing.xs, paddingBottom: Spacing.lg },
  card: {
    minWidth: 136,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: 'transparent',
    ...Shadows.cardLight,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: Radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md, marginBottom: Spacing.sm },
  value: { ...Typography.title2, ...Typography.tabular, color: Colors.textPrimary },
  valueZero: { color: Colors.textTertiary },
  // Alto fijo de 2 líneas: todas las tarjetas miden lo mismo aunque el texto sea corto.
  label: { ...Typography.footnote, color: Colors.textSecondary, minHeight: 36, maxWidth: 120 },
});
