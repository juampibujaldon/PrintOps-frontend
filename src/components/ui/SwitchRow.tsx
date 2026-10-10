import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography } from '../../constants/theme';

interface Props {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
  isLast?: boolean;
}

export default function SwitchRow({ label, description, value, onValueChange, disabled = false, isLast = false }: Props) {
  return (
    <View style={styles.row}>
      <View style={[styles.inner, !isLast && styles.border]}>
        <View style={styles.content}>
          <Text style={[styles.label, disabled && styles.disabled]}>{label}</Text>
          {description ? <Text style={styles.desc}>{description}</Text> : null}
        </View>
        <Switch
          value={value}
          onValueChange={onValueChange}
          disabled={disabled}
          trackColor={{ false: Colors.fillPressed, true: Colors.green }}
          thumbColor="#FFFFFF"
          ios_backgroundColor={Colors.fillPressed}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { paddingLeft: Spacing.lg },
  inner: { flexDirection: 'row', alignItems: 'center', paddingRight: Spacing.lg, minHeight: 52, paddingVertical: Spacing.sm },
  border: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.separator },
  content: { flex: 1, marginRight: Spacing.md },
  label: { ...Typography.body, color: Colors.textPrimary },
  desc: { ...Typography.footnote, color: Colors.textSecondary, marginTop: 2 },
  disabled: { color: Colors.textDisabled },
});
