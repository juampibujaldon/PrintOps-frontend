// src/components/home/FiltersBar.tsx
import React from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Search, XCircle } from 'lucide-react-native';
import { PrinterStatus } from '../../services/printerService';
import { Colors, Radius, Spacing, Typography } from '../../constants/theme';
import Chip from '../ui/Chip';

type Props = {
  statusFilter: 'ALL' | PrinterStatus;
  onStatusFilter: (s: 'ALL' | PrinterStatus) => void;
  search: string;
  onSearch: (s: string) => void;
};

const CHIPS: { value: 'ALL' | PrinterStatus; label: string }[] = [
  { value: 'ALL', label: 'Todas' },
  { value: 'OPERATIVE', label: 'Operativas' },
  { value: 'MAINTENANCE', label: 'En mantenimiento' },
  { value: 'OUT_OF_SERVICE', label: 'Fuera de servicio' },
];

export default function FiltersBar({ statusFilter, onStatusFilter, search, onSearch }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.searchBox}>
        <Search color={Colors.textSecondary} size={16} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar"
          placeholderTextColor={Colors.textSecondary}
          selectionColor={Colors.primary}
          value={search}
          onChangeText={onSearch}
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="never"
          returnKeyType="search"
        />
        {search ? (
          <Pressable onPress={() => onSearch('')} hitSlop={8} accessibilityLabel="Borrar búsqueda">
            <XCircle color={Colors.textTertiary} size={16} />
          </Pressable>
        ) : null}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        {CHIPS.map(chip => (
          <Chip
            key={chip.value}
            label={chip.label}
            selected={statusFilter === chip.value}
            onPress={() => onStatusFilter(chip.value)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: Spacing.lg,
    height: 36,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.sm + 2,
    backgroundColor: Colors.fill,
  },
  searchInput: {
    flex: 1,
    ...Typography.body,
    color: Colors.textPrimary,
    paddingVertical: 0,
  },
  chipsRow: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
});
