import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CheckCircle2, ChevronRight, LucideIcon } from 'lucide-react-native';
import { Colors, Radius, Spacing, Typography, tint } from '../../constants/theme';

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
      <View style={styles.allGood}>
        <CheckCircle2 color={Colors.statusOperativa} size={22} strokeWidth={2} />
        <View style={styles.flex}>
          <Text style={styles.allGoodTitle}>Todo en orden</Text>
          <Text style={styles.allGoodText}>No hay órdenes vencidas, mantenimientos atrasados ni faltantes de stock.</Text>
        </View>
      </View>
    );
  }

  return (
    <View>
      {items.map((item, i) => (
        <TouchableOpacity
          key={item.key}
          style={[styles.row, i < items.length - 1 && styles.separator]}
          onPress={item.onPress}
          accessibilityRole="button"
          accessibilityLabel={`${item.title}: ${item.count}. ${item.detail}`}
        >
          <View style={[styles.iconWrap, { backgroundColor: tint(item.color, 0.14) }]}>
            <item.Icon color={item.color} size={18} strokeWidth={2} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.detail} numberOfLines={1}>{item.detail}</Text>
          </View>
          <View style={[styles.count, { backgroundColor: item.color }]}>
            <Text style={styles.countText}>{item.count}</Text>
          </View>
          <ChevronRight color={Colors.textTertiary} size={18} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  allGood: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.successBg,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  allGoodTitle: { ...Typography.subheadline, fontWeight: '600', color: Colors.successText },
  allGoodText: { ...Typography.footnote, color: Colors.textSecondary, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md },
  separator: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.separator },
  iconWrap: { width: 36, height: 36, borderRadius: Radius.sm, justifyContent: 'center', alignItems: 'center' },
  title: { ...Typography.subheadline, fontWeight: '600', color: Colors.textPrimary },
  detail: { ...Typography.footnote, color: Colors.textSecondary, marginTop: 1 },
  count: { minWidth: 24, height: 24, paddingHorizontal: 7, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  countText: { ...Typography.footnote, fontWeight: '700', color: '#FFFFFF', ...Typography.tabular },
});
