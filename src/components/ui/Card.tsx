import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { Colors, Radius, Shadows, Spacing } from '../../constants/theme';

interface CardProps extends ViewProps {
  // false = sin padding interno (para listas o contenido a sangre).
  padded?: boolean;
}

export default function Card({ style, children, padded = true, ...props }: CardProps) {
  return (
    <View style={[styles.card, padded && styles.padded, style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    ...Shadows.cardLight,
  },
  padded: { padding: Spacing.lg },
});
