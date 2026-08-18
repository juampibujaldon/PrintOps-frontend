// src/components/ui/TextField.tsx
import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Colors, Radius, Spacing, Typography } from '../../constants/theme';

type Props = TextInputProps & {
  label?: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
};

export default function TextField({ label, error, containerStyle, style, ...rest }: Props) {
  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        style={[styles.input, error != null && styles.inputError, style]}
        placeholderTextColor={Colors.textTertiary}
        {...rest}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  label: {
    ...Typography.footnote,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginBottom: Spacing.xs,
    marginLeft: 2,
  },
  input: {
    ...Typography.body,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.separator,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
  },
  inputError: {
    borderColor: Colors.error,
  },
  errorText: {
    ...Typography.footnote,
    color: Colors.error,
    marginTop: Spacing.xs,
    marginLeft: 2,
  },
});
