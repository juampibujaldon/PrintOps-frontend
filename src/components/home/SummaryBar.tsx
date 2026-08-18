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
      <Stat label="Total" value={counts.total} color={Colors.textPrimary} />
      <View style={styles.divider} />
      <Stat label="Operativas" value={counts.operativas} color={Colors.statusOperativa} />
      <View style={styles.divider} />
      <Stat label="Mant." value={counts.mantenimiento} color={Colors.statusMantenim} />
      <View style={styles.divider} />
      <Stat label="Fuera" value={counts.fuera} color={Colors.statusFuera} />
    </Card>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.value, { color }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  value: {
    ...Typography.title2,
    fontWeight: '700',
  },
  label: {
    ...Typography.labelUppercase,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  divider: {
    width: 1,
    backgroundColor: Colors.separator,
    marginVertical: 8,
  },
});
