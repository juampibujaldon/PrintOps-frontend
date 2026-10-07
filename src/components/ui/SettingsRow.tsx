import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Colors, Spacing, Typography } from '../../constants/theme';

interface Props {
  label: string;
  value?: string;
  onPress?: () => void;
  icon?: React.ReactNode;
  showChevron?: boolean;
  isLast?: boolean;
}

export default function SettingsRow({ label, value, onPress, icon, showChevron = true, isLast = false }: Props) {
  const Container = onPress ? TouchableOpacity : View;
  return (
    <Container style={[styles.row, !isLast && styles.border]} onPress={onPress} activeOpacity={0.6}>
      {icon && <View style={styles.icon}>{icon}</View>}
      <View style={styles.content}>
        <Text style={styles.label}>{label}</Text>
        {value ? <Text style={styles.value} numberOfLines={1}>{value}</Text> : null}
      </View>
      {onPress && showChevron && <ChevronRight color={Colors.textTertiary} size={20} />}
    </Container>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, minHeight: 48 },
  border: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  icon: { marginRight: Spacing.md },
  content: { flex: 1, paddingVertical: Spacing.md },
  label: { ...Typography.body, color: Colors.textPrimary },
  value: { ...Typography.subheadline, color: Colors.textTertiary, marginTop: 2 },
});
