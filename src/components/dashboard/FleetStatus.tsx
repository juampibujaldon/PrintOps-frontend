import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Spacing, Typography } from '../../constants/theme';

interface Props {
  operative: number;
  maintenance: number;
  outOfService: number;
  total: number;
}

// Barra apilada con el estado actual de todas las impresoras + leyenda.
export default function FleetStatus({ operative, maintenance, outOfService, total }: Props) {
  const segments = [
    { label: 'Operativas', value: operative, color: Colors.statusOperativa },
    { label: 'Mantenimiento', value: maintenance, color: Colors.statusMantenim },
    { label: 'Fuera de servicio', value: outOfService, color: Colors.statusFuera },
  ];
  const operativePct = total > 0 ? Math.round((operative / total) * 100) : 0;

  return (
    <View>
      <View style={styles.headline}>
        <Text style={styles.big}>{operativePct}%</Text>
        <Text style={styles.bigLabel}>operativas ahora · {total} impresoras</Text>
      </View>

      <View style={styles.bar}>
        {total === 0 ? (
          <View style={[styles.segment, { flex: 1, backgroundColor: Colors.fill }]} />
        ) : (
          segments.filter(s => s.value > 0).map(s => (
            <View key={s.label} style={[styles.segment, { flex: s.value, backgroundColor: s.color }]} />
          ))
        )}
      </View>

      <View style={styles.legend}>
        {segments.map(s => (
          <View key={s.label} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: s.color }]} />
            <Text style={styles.legendText}>
              <Text style={styles.legendValue}>{s.value}</Text> {s.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headline: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.sm, marginBottom: Spacing.md },
  big: { ...Typography.title, ...Typography.tabular, color: Colors.textPrimary },
  bigLabel: { ...Typography.footnote, color: Colors.textSecondary, flexShrink: 1 },
  bar: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', gap: 2, backgroundColor: Colors.fill },
  segment: { height: '100%' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: Spacing.lg, rowGap: Spacing.xs, marginTop: Spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { ...Typography.footnote, color: Colors.textSecondary },
  legendValue: { fontWeight: '700', color: Colors.textPrimary },
});
