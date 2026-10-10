import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Colors, Spacing, Typography, Icons } from '../../constants/theme';

interface Props {
  label: string;
  value?: string;
  onPress?: () => void;
  icon?: React.ReactNode;
  showChevron?: boolean;
  isLast?: boolean;
  destructive?: boolean;
}

// Fila de lista agrupada estilo iOS: resaltado gris al presionar y separador
// hairline que arranca después del ícono.
export default function SettingsRow({ label, value, onPress, icon, showChevron = true, isLast = false, destructive = false }: Props) {
  const body = (
    <>
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <View style={[styles.content, !isLast && styles.border]}>
        <View style={styles.texts}>
          <Text style={[styles.label, destructive && styles.destructive]}>{label}</Text>
          {value ? <Text style={styles.value} numberOfLines={1}>{value}</Text> : null}
        </View>
        {onPress && showChevron ? <ChevronRight color={Colors.textTertiary} size={18} strokeWidth={Icons.strokeWidth} /> : null}
      </View>
    </>
  );

  if (!onPress) {
    return <View style={styles.row}>{body}</View>;
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingLeft: Spacing.lg, minHeight: 48 },
  pressed: { backgroundColor: Colors.fill },
  icon: { marginRight: Spacing.md },
  content: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, paddingRight: Spacing.lg, minHeight: 48 },
  border: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.separator },
  texts: { flex: 1 },
  label: { ...Typography.body, color: Colors.textPrimary },
  destructive: { color: Colors.red },
  value: { ...Typography.subheadline, color: Colors.textSecondary, marginTop: 2 },
});
