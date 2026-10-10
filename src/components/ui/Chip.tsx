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
    height: 34,
    justifyContent: 'center',
    paddingHorizontal: Spacing.md + 2,
    borderRadius: Radius.full,
    backgroundColor: Colors.fill,
  },
  selectedBg: { backgroundColor: Colors.textPrimary },
  text: { ...Typography.subheadline, fontWeight: '500', color: Colors.textPrimary },
  selectedText: { color: Colors.surface },
});
