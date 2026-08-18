// src/components/ui/Card.tsx
import React from 'react';
import { StyleSheet, View, ViewProps, StyleProp, ViewStyle } from 'react-native';
import { Colors, Radius, Shadows, Spacing } from '../../constants/theme';

type Props = ViewProps & {
  padded?: boolean;
  elevated?: boolean;
  style?: StyleProp<ViewStyle>;
};

export default function Card({ padded = true, elevated = false, style, children, ...rest }: Props) {
  return (
    <View
      style={[styles.base, padded && styles.padded, elevated && Shadows.card, style]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.separator,
  },
  padded: {
    padding: Spacing.md,
  },
});
