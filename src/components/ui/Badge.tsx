import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Radius, Spacing, Typography } from '../../constants/theme';

interface BadgeProps {
  label: string;
  bgColor: string;
  textColor: string;
}

export default function Badge({ label, bgColor, textColor }: BadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: bgColor }]}>
      <Text style={[styles.text, { color: textColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  text: {
    ...Typography.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
  }
});
