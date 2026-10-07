import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { Colors, Radius, Spacing, Typography } from '../../constants/theme';
import PressableScale from './PressableScale';

export default function Chip({ label, selected, onPress }: { label: string, selected: boolean, onPress: () => void }) {
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.chip, selected && styles.selectedBg]}
    >
      <Text style={[styles.text, selected && styles.selectedText]}>{label}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  selectedBg: { backgroundColor: Colors.textPrimary, borderColor: Colors.textPrimary },
  text: { ...Typography.footnote, fontWeight: '600', color: Colors.textSecondary },
  selectedText: { color: Colors.surface },
});
