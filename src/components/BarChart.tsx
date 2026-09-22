// src/components/BarChart.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Radius, Spacing } from '../constants/theme';
import { MonthlyCostDTO } from '../types/dashboard';

// Gráfico de barras de costos por mes (US-08). Implementación ligera con Views
// nativos (sin chart-kit) para evitar dependencias: barras en el color de acento,
// eje Y en $ y tooltip al tocar una barra.
function money(v: number): string {
  return `$${v.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;
}

function moneyExact(v: number): string {
  return `$${v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function shortMonth(month: string): string {
  const names = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const m = Number(month.split('-')[1]);
  return names[m - 1] ?? month;
}

export default function BarChart({ data }: { data: MonthlyCostDTO[] }) {
  const [selected, setSelected] = useState<number | null>(null);
  const max = Math.max(1, ...data.map(d => d.cost));

  if (!data || data.length === 0) {
    return <Text style={styles.empty}>Sin datos de costos</Text>;
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.chartRow}>
        {/* Eje Y */}
        <View style={styles.yAxis}>
          <Text style={styles.yLabel}>{money(max)}</Text>
          <Text style={styles.yLabel}>{money(max / 2)}</Text>
          <Text style={styles.yLabel}>$0</Text>
        </View>

        {/* Barras */}
        <View style={styles.bars}>
          {data.map((d, i) => {
            const pct = (d.cost / max) * 100;
            const isSel = selected === i;
            return (
              <TouchableOpacity
                key={d.month}
                style={styles.barCol}
                activeOpacity={0.8}
                onPress={() => setSelected(isSel ? null : i)}
              >
                {isSel ? <Text style={styles.tooltip}>{moneyExact(d.cost)}</Text> : null}
                <View style={styles.barTrack}>
                  <View style={[styles.bar, { height: `${Math.max(pct, 3)}%` }]} />
                </View>
                <Text style={styles.xLabel}>{shortMonth(d.month)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginTop: Spacing.sm },
  chartRow: { flexDirection: 'row', height: 180 },
  yAxis: {
    width: 44,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: Spacing.xs,
    paddingBottom: 22,
  },
  yLabel: { fontSize: 10, color: Colors.textTertiary },
  bars: { flex: 1, flexDirection: 'row', alignItems: 'flex-end' },
  barCol: { flex: 1, alignItems: 'center', height: '100%' },
  tooltip: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
    paddingHorizontal: 4,
    borderRadius: Radius.sm,
    marginBottom: 2,
  },
  barTrack: { flex: 1, justifyContent: 'flex-end', width: '60%' },
  bar: {
    backgroundColor: Colors.accent,
    borderTopLeftRadius: Radius.sm,
    borderTopRightRadius: Radius.sm,
  },
  xLabel: { fontSize: 10, color: Colors.textSecondary, marginTop: 4 },
  empty: { color: Colors.textTertiary, fontSize: 13, textAlign: 'center', marginVertical: Spacing.lg },
});
