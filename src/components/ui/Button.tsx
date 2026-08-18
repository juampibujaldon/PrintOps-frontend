// src/components/ui/Button.tsx
import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextStyle,
  ViewStyle,
  StyleProp,
} from 'react-native';
import PressableScale from './PressableScale';
import { Colors, Radius, Spacing, Typography } from '../../constants/theme';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

type Props = {
  title: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

const VIEW_STYLES: Record<Variant, ViewStyle> = {
  primary: { backgroundColor: Colors.accent },
  secondary: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.separator },
  danger: { backgroundColor: Colors.error },
  ghost: { backgroundColor: 'transparent' },
};

const TEXT_STYLES: Record<Variant, TextStyle> = {
  primary: { color: Colors.onAccent },
  secondary: { color: Colors.textPrimary },
  danger: { color: Colors.onAccent },
  ghost: { color: Colors.accent },
};

export default function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
}: Props) {
  const isDisabled = disabled || loading;
  const spinnerColor = TEXT_STYLES[variant].color as string;

  return (
    <PressableScale
      onPress={onPress}
      disabled={isDisabled}
      style={[styles.base, VIEW_STYLES[variant], isDisabled && styles.disabled, style]}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor} />
      ) : (
        <Text style={[styles.text, TEXT_STYLES[variant]]}>{title}</Text>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 50,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  text: {
    ...Typography.headline,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.4,
  },
});
