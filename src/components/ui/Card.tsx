import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { Colors, Radius, Shadows, Spacing } from '../../constants/theme';

export default function Card({ style, children, ...props }: ViewProps) {
  return (
    <View style={[styles.card, style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    ...Shadows.cardLight,
    borderWidth: 1,
    borderColor: Colors.border,
  }
});
