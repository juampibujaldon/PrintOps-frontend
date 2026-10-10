import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Radius, Spacing, Typography } from '../../constants/theme';

interface Props {
  title?: string;
  footer?: string;
  children: React.ReactNode;
}

// Sección "inset grouped" de iOS: tarjeta redondeada con título y pie opcionales.
export default function SettingsSection({ title, footer, children }: Props) {
  return (
    <View style={styles.container}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <View style={styles.content}>{children}</View>
      {footer ? <Text style={styles.footer}>{footer}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.xl, marginHorizontal: Spacing.lg },
  title: { ...Typography.footnote, color: Colors.textSecondary, textTransform: 'uppercase', marginBottom: 6, paddingHorizontal: Spacing.lg },
  content: { backgroundColor: Colors.surface, borderRadius: Radius.md, overflow: 'hidden' },
  footer: { ...Typography.footnote, color: Colors.textSecondary, marginTop: 6, paddingHorizontal: Spacing.lg, lineHeight: 18 },
});
