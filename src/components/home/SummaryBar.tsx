// src/components/home/SummaryBar.tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PrinterResponse } from '../../services/printerService';
import { Colors, Spacing, Typography } from '../../constants/theme';
import Card from '../ui/Card';

type Props = {
  printers: PrinterResponse[];
};

export default function SummaryBar({ printers }: Props) {
  const counts = {
    total: printers.length,
    operativas: printers.filter(p => p.status === 'OPERATIVE').length,
    mantenimiento: printers.filter(p => p.status === 'MAINTENANCE').length,
    fuera: printers.filter(p => p.status === 'OUT_OF_SERVICE').length,
  };

  return (
    <Card padded={false} style={styles.bar}>
      <Stat label="Total" value={counts.total} />
      <View style={styles.divider} />
      <Stat label="Operativas" value={counts.operativas} dot={Colors.green} />
      <View style={styles.divider} />
      <Stat label="Mantenim." value={counts.mantenimiento} dot={Colors.orange} />
      <View style={styles.divider} />
      <Stat label="Fuera" value={counts.fuera} dot={Colors.red} />
    </Card>
  );
}

function Stat({ label, value, dot }: { label: string; value: number; dot?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.value}>{value}</Text>
      <View style={styles.labelRow}>
        {dot ? <View style={[styles.dot, { backgroundColor: dot }]} /> : null}
        <Text style={styles.label} numberOfLines={1}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  value: {
    ...Typography.title2,
    ...Typography.tabular,
    color: Colors.textPrimary,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  label: {
    ...Typography.caption1,
    color: Colors.textSecondary,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: Colors.separator,
    marginVertical: Spacing.md,
  },
});
