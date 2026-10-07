import React from 'react';
import { StyleSheet, Text, ActivityIndicator, ViewStyle, StyleProp } from 'react-native';
import { Colors, Spacing, Radius, Typography } from '../../constants/theme';
import PressableScale from './PressableScale';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps {
  title: string;
  variant?: ButtonVariant;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function Button({ title, variant = 'primary', onPress, disabled, loading, style }: ButtonProps) {
  const isPrimary = variant === 'primary';
  const isSecondary = variant === 'secondary';
  
  let bg = isPrimary ? Colors.primary : isSecondary ? Colors.background : 'transparent';
  let tc = isPrimary ? Colors.onPrimary : isSecondary ? Colors.textPrimary : Colors.primary;
  let bc = isSecondary ? Colors.border : 'transparent';
  
  if (disabled) {
    bg = isPrimary ? Colors.primaryDisabled : isSecondary ? Colors.background : 'transparent';
    tc = isPrimary ? Colors.surface : Colors.textDisabled;
    bc = isSecondary ? Colors.separator : 'transparent';
  }

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.base,
        { backgroundColor: bg, borderColor: bc, borderWidth: isSecondary ? 1 : 0 },
        style
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator color={tc} />
      ) : (
        <Text style={[styles.text, { color: tc }]}>{title}</Text>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 48,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  text: {
    ...Typography.body,
    fontWeight: '600',
  },
});
