import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { Colors, Spacing, Typography } from '../../constants/theme';
import Button from './Button';

export default function ErrorState({ error, onRetry }: { error: string, onRetry: () => void }) {
  return (
    <View style={styles.container}>
      <AlertCircle color={Colors.error} size={48} style={styles.icon} />
      <Text style={styles.title}>Ocurrió un problema</Text>
      <Text style={styles.desc}>{error}</Text>
      <Button title="Reintentar" variant="secondary" onPress={onRetry} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  icon: { marginBottom: Spacing.md },
  title: { ...Typography.headline, color: Colors.textPrimary, textAlign: 'center', marginBottom: Spacing.xs },
  desc: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.xl },
});
