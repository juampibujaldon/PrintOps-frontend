// src/components/HistoryFilters.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Colors, Radius, Spacing } from '../constants/theme';
import { HistoryFiltersState, OrderType } from '../types/history';

// Chips de tipo: "Todos" (null) o un tipo concreto.
const TYPE_CHIPS: { value: OrderType | null; label: string }[] = [
  { value: null, label: 'Todos' },
  { value: 'PREVENTIVE', label: 'Preventivo' },
  { value: 'CORRECTIVE', label: 'Correctivo' },
  { value: 'CALIBRATION', label: 'Calibración' },
];

export default function HistoryFilters({
  filters,
  onChange,
}: {
  filters: HistoryFiltersState;
  onChange: (f: HistoryFiltersState) => void;
}) {
  // "from" | "to" | null indica qué DateTimePicker está abierto.
  const [picker, setPicker] = useState<'from' | 'to' | null>(null);

  const setType = (type: OrderType | null) => onChange({ ...filters, type });

  const setDate = (field: 'from' | 'to', date: Date) => {
    const iso = date.toISOString().split('T')[0];
    onChange({ ...filters, [field]: iso });
  };

  const handlePickerChange = (event: DateTimePickerEvent, date?: Date) => {
    if (date && picker) {
      setDate(picker, date);
    }
    // En Android el picker es un diálogo modal: se cierra solo al elegir/dismiss.
    if (Platform.OS === 'android') {
      setPicker(null);
    }
  };

  const pickerValue = (() => {
    if (!picker) return new Date();
    const iso = picker === 'from' ? filters.from : filters.to;
    return iso ? new Date(iso + 'T00:00:00') : new Date();
  })();

  const hasDates = !!(filters.from || filters.to);

  return (
    <View style={styles.container}>
      {/* Fila 1: chips de tipo */}
      <View style={styles.chipRow}>
        {TYPE_CHIPS.map(c => {
          const selected = filters.type === c.value;
          return (
            <TouchableOpacity
              key={c.label}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => setType(c.value)}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{c.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Fila 2: rango de fechas */}
      <View style={styles.dateRow}>
        <TouchableOpacity style={styles.dateBtn} onPress={() => setPicker(p => (p === 'from' ? null : 'from'))}>
          <Text style={styles.dateLabel}>Desde</Text>
          <Text style={styles.dateValue}>{filters.from ?? '—'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.dateBtn} onPress={() => setPicker(p => (p === 'to' ? null : 'to'))}>
          <Text style={styles.dateLabel}>Hasta</Text>
          <Text style={styles.dateValue}>{filters.to ?? '—'}</Text>
        </TouchableOpacity>

        {hasDates ? (
          <TouchableOpacity style={styles.clearBtn} onPress={() => onChange({ ...filters, from: null, to: null })}>
            <Text style={styles.clearText}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* DateTimePicker nativo */}
      {picker ? (
        <View style={styles.pickerWrap}>
          <DateTimePicker
            value={pickerValue}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handlePickerChange}
          />
          {Platform.OS === 'ios' ? (
            <TouchableOpacity style={styles.doneBtn} onPress={() => setPicker(null)}>
              <Text style={styles.doneText}>Listo</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.md },
  chipRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  chip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
  },
  chipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600' },
  chipTextSelected: { color: Colors.background },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  dateBtn: {
    flex: 1,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  dateLabel: { fontSize: 11, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  dateValue: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginTop: 2 },
  clearBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearText: { color: Colors.accent, fontSize: 16, fontWeight: '700' },
  pickerWrap: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.surfaceBase,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    overflow: 'hidden',
  },
  doneBtn: { alignSelf: 'flex-end', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  doneText: { color: Colors.primary, fontWeight: '700' },
});
