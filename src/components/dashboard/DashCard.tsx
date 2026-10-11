import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Colors, Radius, Shadows, Spacing, Typography } from '../../constants/theme';

interface Props {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  children: React.ReactNode;
}

// Tarjeta de sección del dashboard: título, subtítulo opcional y un link
// "Ver todo" que lleva a la pantalla donde se actúa sobre esos datos.
export default function DashCard({ title, subtitle, actionLabel, onAction, children }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {actionLabel && onAction ? (
          <TouchableOpacity style={styles.action} onPress={onAction} hitSlop={8} accessibilityRole="button">
            <Text style={styles.actionText}>{actionLabel}</Text>
            <ChevronRight color={Colors.primary} size={16} strokeWidth={2} />
          </TouchableOpacity>
        ) : null}
      </View>
      {children}
    </View>
  );
}

// Mensaje de sección no disponible (fuente caída), sin romper el resto.
export function Unavailable({ text = 'No se pudo cargar esta información.' }: { text?: string }) {
  return <Text style={styles.unavailable}>{text}</Text>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.cardLight,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.md, gap: Spacing.sm },
  title: { ...Typography.headline, color: Colors.textPrimary },
  subtitle: { ...Typography.footnote, color: Colors.textSecondary, marginTop: 2 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingTop: 2 },
  actionText: { ...Typography.subheadline, color: Colors.primary, fontWeight: '500' },
  unavailable: { ...Typography.footnote, color: Colors.textTertiary },
});
