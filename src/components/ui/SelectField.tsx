import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { Colors, Radius, Spacing, Typography } from '../../constants/theme';

interface Props {
  label: string;
  value: string;
  onPress: () => void;
  disabled?: boolean;
}

export default function SelectField({ label, value, onPress, disabled = false }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.select} onPress={onPress} disabled={disabled} activeOpacity={0.6}>
        <Text style={[styles.value, disabled && styles.disabled]}>{value}</Text>
        <ChevronDown color={disabled ? Colors.textDisabled : Colors.textTertiary} size={20} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  label: { ...Typography.footnote, fontWeight: '600', color: Colors.textSecondary, marginBottom: Spacing.xs },
  select: {
    height: 48,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  value: { ...Typography.body, color: Colors.textPrimary },
  disabled: { color: Colors.textDisabled },
});
