// src/components/home/FiltersBar.tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PrinterStatus } from '../../services/printerService';
import { Colors, Radius, Spacing, Typography } from '../../constants/theme';
import PressableScale from '../ui/PressableScale';
import TextField from '../ui/TextField';

type Props = {
  statusFilter: 'ALL' | PrinterStatus;
  onStatusFilter: (s: 'ALL' | PrinterStatus) => void;
  brandFilter: string;
  onBrandFilter: (s: string) => void;
  locationFilter: string;
  onLocationFilter: (s: string) => void;
};

const CHIPS: { value: 'ALL' | PrinterStatus; label: string }[] = [
  { value: 'ALL', label: 'Todos' },
  { value: 'OPERATIVE', label: 'Operativa' },
  { value: 'MAINTENANCE', label: 'En mant.' },
  { value: 'OUT_OF_SERVICE', label: 'Fuera serv.' },
];

export default function FiltersBar({
  statusFilter,
  onStatusFilter,
  brandFilter,
  onBrandFilter,
  locationFilter,
  onLocationFilter,
}: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.chipsRow}>
        {CHIPS.map(chip => {
          const selected = statusFilter === chip.value;
          return (
            <PressableScale key={chip.value} style={[styles.chip, selected && styles.chipSelected]} onPress={() => onStatusFilter(chip.value)}>
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{chip.label}</Text>
            </PressableScale>
          );
        })}
      </View>
      <TextField
        containerStyle={styles.input}
        placeholder="Filtrar por marca"
        value={brandFilter}
        onChangeText={onBrandFilter}
      />
      <TextField
        containerStyle={styles.input}
        placeholder="Filtrar por ubicación"
        value={locationFilter}
        onChangeText={onLocationFilter}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.separator,
  },
  chipSelected: {
    backgroundColor: Colors.textPrimary,
    borderColor: Colors.textPrimary,
  },
  chipText: {
    ...Typography.caption1,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: Colors.background,
  },
  input: {
    marginBottom: 0,
  },
});
