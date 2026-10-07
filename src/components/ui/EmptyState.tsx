import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography } from '../../constants/theme';

export default function EmptyState({ icon, title, description }: { icon?: React.ReactNode, title: string, description?: string }) {
  return (
    <View style={styles.container}>
      {icon && <View style={styles.icon}>{icon}</View>}
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.desc}>{description}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl * 2 },
  icon: { marginBottom: Spacing.lg },
  title: { ...Typography.headline, color: Colors.textPrimary, textAlign: 'center', marginBottom: Spacing.xs },
  desc: { ...Typography.subheadline, color: Colors.textSecondary, textAlign: 'center' },
});
