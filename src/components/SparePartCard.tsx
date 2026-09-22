// src/components/SparePartCard.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Radius, Spacing, Typography } from '../constants/theme';
import { SparePartDTO } from '../types/parts';

// Tarjeta de repuesto en el inventario (US-10).
// Props: { part, onMenuPress, onPress }
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
  const barColor = part.isLowStock ? Colors.statusFuera : Colors.statusOperativa;

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={onPress}>
      <View style={styles.topRow}>
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>{part.name}</Text>
            {part.isOutOfStock ? <Text style={styles.outBadge}>SIN STOCK</Text> : null}
          </View>
          <Text style={styles.partNumber}>Parte: {part.partNumber}</Text>
          <Text style={styles.price}>${part.unitPrice.toFixed(2)}</Text>
        </View>

        {part.category ? (
          <View style={styles.categoryChip}>
            <Text style={styles.categoryText}>{part.category}</Text>
          </View>
        ) : null}

        <TouchableOpacity style={styles.menuBtn} onPress={onMenuPress} hitSlop={8}>
          <Text style={styles.menuText}>···</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.stockRow}>
        <Text style={styles.stockLabel}>
          stock: {part.stock} / mín: {part.minStock}
        </Text>
        <Text style={[styles.stockPct, { color: barColor }]}>{Math.round(pct)}%</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: barColor }]} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.separator,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  topRow: { flexDirection: 'row', alignItems: 'flex-start' },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  name: { ...Typography.headline, color: Colors.textPrimary, flexShrink: 1 },
  outBadge: {
    ...Typography.caption2,
    color: Colors.onAccent,
    backgroundColor: Colors.statusFuera,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    overflow: 'hidden',
  },
  partNumber: { ...Typography.footnote, color: Colors.textSecondary, marginTop: 2 },
  price: { ...Typography.footnote, color: Colors.textTertiary, marginTop: 2 },
  categoryChip: {
    backgroundColor: Colors.background,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: Spacing.sm,
  },
  categoryText: { ...Typography.caption2, color: Colors.textSecondary },
  menuBtn: { paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  menuText: { fontSize: 20, fontWeight: '700', color: Colors.textTertiary, letterSpacing: 1 },
  stockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  stockLabel: { ...Typography.caption1, color: Colors.textSecondary },
  stockPct: { ...Typography.caption1, fontWeight: '700' },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.background,
    marginTop: Spacing.xs,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 3 },
});
