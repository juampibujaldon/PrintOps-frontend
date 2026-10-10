import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { Colors, Radius, Spacing, Typography, Icons } from '../../constants/theme';

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
      <Pressable
        style={({ pressed }) => [styles.select, pressed && styles.pressed]}
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value}`}
      >
        <Text style={[styles.value, disabled && styles.disabled]} numberOfLines={1}>{value}</Text>
        <ChevronDown color={disabled ? Colors.textDisabled : Colors.textTertiary} size={18} strokeWidth={Icons.strokeWidth} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  label: { ...Typography.footnote, color: Colors.textSecondary, marginBottom: 6, marginLeft: 4 },
  select: {
    minHeight: 46,
    backgroundColor: Colors.fill,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pressed: { backgroundColor: Colors.fillPressed },
  value: { ...Typography.body, color: Colors.textPrimary, flex: 1, marginRight: Spacing.sm },
  disabled: { color: Colors.textDisabled },
});
