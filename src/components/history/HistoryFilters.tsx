// src/components/history/HistoryFilters.tsx
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Colors, Radius, Spacing, Typography } from '../../constants/theme';
import { ORDER_TYPE } from '../../constants/orders';
import { OrderType } from '../../services/orderService';
import PressableScale from '../ui/PressableScale';

interface HistoryFiltersProps {
  type: OrderType | null;
  from: string | null; // YYYY-MM-DD
  to: string | null;   // YYYY-MM-DD
  onTypeChange: (type: OrderType | null) => void;
  onDateRangeChange: (from: string | null, to: string | null) => void;
}

const TYPE_OPTIONS: (OrderType | null)[] = [null, 'PREVENTIVE', 'CORRECTIVE', 'CALIBRATION'];

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function toISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatShort(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(`${iso}T00:00:00`);
  if (isNaN(date.getTime())) return null;
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

// Barra de filtros: chips de tipo (fila 1) y rango de fechas (fila 2).
export default function HistoryFilters({
  type,
  from,
  to,
  onTypeChange,
  onDateRangeChange,
}: HistoryFiltersProps) {
  const [pickerTarget, setPickerTarget] = useState<'from' | 'to' | null>(null);

  const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
    setPickerTarget(null);
    if (event.type !== 'set' || !date) return;

    if (pickerTarget === 'from') {
      onDateRangeChange(toISO(date), to);
    } else if (pickerTarget === 'to') {
      onDateRangeChange(from, toISO(date));
    }
  };

  const fromShort = formatShort(from);
  const toShort = formatShort(to);

  return (
    <View style={styles.container}>
      {/* Fila 1 — chips de tipo */}
      <View style={styles.chipsRow}>
        {TYPE_OPTIONS.map(option => {
          const active = type === option;
          const label = option ? ORDER_TYPE[option].label : 'Todos';
          const color = option ? ORDER_TYPE[option].color : Colors.textPrimary;
          return (
            <PressableScale
              key={option ?? 'todos'}
              onPress={() => onTypeChange(option)}
              style={[styles.chip, active && { backgroundColor: color, borderColor: color }]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
            </PressableScale>
          );
        })}
      </View>

      {/* Fila 2 — rango de fechas */}
      <View style={styles.dateRow}>
        <PressableScale style={styles.dateButton} onPress={() => setPickerTarget('from')}>
          <Text style={styles.dateButtonText}>Desde</Text>
        </PressableScale>
        <PressableScale style={styles.dateButton} onPress={() => setPickerTarget('to')}>
          <Text style={styles.dateButtonText}>Hasta</Text>
        </PressableScale>

        {fromShort && toShort ? (
          <View style={styles.rangeLabel}>
            <Text style={styles.rangeText}>{fromShort} – {toShort}</Text>
            <PressableScale onPress={() => onDateRangeChange(null, null)} hitSlop={8}>
              <Text style={styles.clearText}>✕</Text>
            </PressableScale>
          </View>
        ) : (
          <Text style={styles.rangeHint}>Rango opcional</Text>
        )}
      </View>

      {pickerTarget && (
        <DateTimePicker
          value={new Date()}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.separator,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.separator,
    backgroundColor: Colors.surface,
  },
  chipText: {
    ...Typography.footnote,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dateButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.separator,
    backgroundColor: Colors.background,
  },
  dateButtonText: {
    ...Typography.footnote,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  rangeLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flexShrink: 1,
  },
  rangeText: {
    ...Typography.footnote,
    color: Colors.textPrimary,
    flexShrink: 1,
  },
  rangeHint: {
    ...Typography.caption1,
    color: Colors.textTertiary,
  },
  clearText: {
    ...Typography.footnote,
    color: Colors.textSecondary,
    fontWeight: '700',
  },
});
