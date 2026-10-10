import React from 'react';
import { StyleSheet, Text, ActivityIndicator, ViewStyle, StyleProp, View } from 'react-native';
import { Colors, Spacing, Radius, Typography } from '../../constants/theme';
import PressableScale from './PressableScale';

export type ButtonVariant = 'primary' | 'secondary' | 'tinted' | 'ghost' | 'danger';

interface ButtonProps {
  title: string;
  variant?: ButtonVariant;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

const PALETTE: Record<ButtonVariant, { bg: string; fg: string }> = {
  primary: { bg: Colors.primary, fg: Colors.onPrimary },
  secondary: { bg: Colors.fill, fg: Colors.textPrimary },
  tinted: { bg: Colors.primaryTint, fg: Colors.primary },
  ghost: { bg: 'transparent', fg: Colors.primary },
  danger: { bg: Colors.errorBg, fg: Colors.red },
};

export default function Button({ title, variant = 'primary', onPress, disabled, loading, icon, style }: ButtonProps) {
  const { bg, fg } = PALETTE[variant];
  const inactive = disabled || loading;

  return (
    <PressableScale
      onPress={onPress}
      disabled={inactive}
      style={[styles.base, { backgroundColor: bg }, disabled && styles.disabled, style]}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.content}>
          {icon}
          <Text style={[styles.text, { color: fg }]} numberOfLines={1}>{title}</Text>
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 50,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  disabled: { opacity: 0.4 },
  text: {
    ...Typography.headline,
  },
});
