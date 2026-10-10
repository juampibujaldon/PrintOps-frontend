import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { AlertCircle } from 'lucide-react-native';
import { Colors, Spacing, Typography, Icons } from '../../constants/theme';
import Button from './Button';

export default function ErrorState({ error, onRetry }: { error: string, onRetry: () => void }) {
  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.container}>
      <AlertCircle color={Colors.textTertiary} size={44} strokeWidth={Icons.strokeWidth} style={styles.icon} />
      <Text style={styles.title}>Algo salió mal</Text>
      <Text style={styles.desc}>{error}</Text>
      <View>
        <Button title="Reintentar" variant="tinted" onPress={onRetry} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xxl },
  icon: { marginBottom: Spacing.lg },
  title: { ...Typography.title3, color: Colors.textPrimary, textAlign: 'center', marginBottom: Spacing.xs },
  desc: { ...Typography.subheadline, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.xl, lineHeight: 20 },
});
