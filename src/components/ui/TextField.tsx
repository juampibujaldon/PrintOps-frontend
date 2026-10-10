import React from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps, StyleProp, ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { Colors, Radius, Spacing, Typography } from '../../constants/theme';
import { useFocusRing } from './useFocusRing';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

export default function TextField({ label, error, style, containerStyle, onFocus, onBlur, ...props }: Props) {
  const { ringStyle, handleFocus, handleBlur } = useFocusRing(!!error, onFocus, onBlur);
  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <AnimatedTextInput
        style={[styles.input, ringStyle, style]}
        placeholderTextColor={Colors.textTertiary}
        selectionColor={Colors.primary}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.md },
  label: { ...Typography.footnote, color: Colors.textSecondary, marginBottom: 6, marginLeft: 4 },
  input: {
    minHeight: 46,
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    color: Colors.textPrimary,
    ...Typography.body,
  },
  error: { ...Typography.footnote, color: Colors.errorText, marginTop: 6, marginLeft: 4 },
});
