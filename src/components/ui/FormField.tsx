import React from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { Colors, Radius, Spacing, Typography } from '../../constants/theme';

interface Props extends TextInputProps {
  label: string;
  error?: string;
  hint?: string;
}

export default function FormField({ label, error, hint, style, ...props }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, error && styles.inputError, style]}
        placeholderTextColor={Colors.textTertiary}
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {hint && !error ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  label: { ...Typography.footnote, fontWeight: '600', color: Colors.textSecondary, marginBottom: Spacing.xs },
  input: {
    height: 48,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    color: Colors.textPrimary,
    ...Typography.body,
  },
  inputError: { borderColor: Colors.errorBg },
  error: { ...Typography.caption, color: Colors.errorText, marginTop: Spacing.xs },
  hint: { ...Typography.caption, color: Colors.textTertiary, marginTop: Spacing.xs },
});
