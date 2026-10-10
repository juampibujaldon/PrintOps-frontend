import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Colors, Spacing, Typography } from '../../constants/theme';

export default function EmptyState({ icon, title, description, action }: { icon?: React.ReactNode, title: string, description?: string, action?: React.ReactNode }) {
  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.container}>
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.desc}>{description}</Text> : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.xxl, paddingVertical: Spacing.xxl * 2 },
  icon: { marginBottom: Spacing.lg },
  title: { ...Typography.title3, color: Colors.textPrimary, textAlign: 'center', marginBottom: Spacing.xs },
  desc: { ...Typography.subheadline, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  action: { marginTop: Spacing.xl, alignSelf: 'stretch' },
});
