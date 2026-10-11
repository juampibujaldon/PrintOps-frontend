import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react-native';
import { Colors, Radius, Spacing, Typography } from '../../constants/theme';

interface Props {
  label: string;
  value: string;
  // Valores numéricos del período actual y anterior para calcular la variación.
  current?: number | null;
  previous?: number | null;
  // true si subir es malo (p. ej. costos): invierte el color de la variación.
  invert?: boolean;
  // Variación en puntos porcentuales en vez de % relativo (p. ej. disponibilidad).
  deltaInPoints?: boolean;
  hint?: string;
  tone?: 'default' | 'danger';
}

export default function KpiTile({ label, value, current, previous, invert, deltaInPoints, hint, tone = 'default' }: Props) {
  const delta = computeDelta(current, previous, deltaInPoints);

  return (
    <View style={[styles.tile, tone === 'danger' && styles.tileDanger]}>
      <Text style={styles.label} numberOfLines={1}>{label}</Text>
      <Text style={[styles.value, tone === 'danger' && { color: Colors.errorText }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {delta ? (
        <DeltaBadge delta={delta.value} text={delta.text} invert={invert} />
      ) : (
        <Text style={styles.hint} numberOfLines={1}>{hint ?? ' '}</Text>
      )}
    </View>
  );
}

function computeDelta(current?: number | null, previous?: number | null, inPoints?: boolean) {
  if (current == null || previous == null) return null;
  if (inPoints) {
    const d = current - previous;
    return { value: d, text: `${d >= 0 ? '+' : ''}${d.toFixed(1)} pts` };
  }
  if (previous === 0) return current === 0 ? null : { value: 1, text: 'nuevo' };
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  return { value: pct, text: `${pct >= 0 ? '+' : ''}${pct.toFixed(0)}%` };
}

function DeltaBadge({ delta, text, invert }: { delta: number; text: string; invert?: boolean }) {
  const flat = Math.abs(delta) < 0.5;
  const good = invert ? delta < 0 : delta > 0;
  const color = flat ? Colors.textSecondary : good ? Colors.successText : Colors.errorText;
  const Icon = delta >= 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <View style={styles.deltaRow}>
      {!flat && <Icon color={color} size={13} strokeWidth={2.5} />}
      <Text style={[styles.delta, { color }]} numberOfLines={1}>{text}</Text>
      <Text style={styles.deltaHint} numberOfLines={1}> vs. anterior</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  tileDanger: { backgroundColor: Colors.errorBg },
  label: { ...Typography.footnote, color: Colors.textSecondary },
  value: { ...Typography.title2, ...Typography.tabular, color: Colors.textPrimary, marginTop: 4 },
  hint: { ...Typography.caption, color: Colors.textTertiary, marginTop: 4 },
  deltaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  delta: { ...Typography.caption, fontWeight: '600', ...Typography.tabular },
  deltaHint: { ...Typography.caption, color: Colors.textTertiary, flexShrink: 1 },
});
