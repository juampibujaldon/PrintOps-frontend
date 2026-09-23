// src/components/MetricsSummary.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Colors, Radius, Spacing } from '../constants/theme';
import { PrinterMetricsDTO } from '../types/history';

// LayoutAnimation no está habilitado por defecto en Android.
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function fmtMoney(v: number): string {
  return `$${v.toFixed(2)}`;
}

export default function MetricsSummary({
  metrics,
  loading,
}: {
  metrics: PrinterMetricsDTO | null;
  loading: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(e => !e);
  };

  if (loading) {
    return (
      <View style={styles.card}>
        <View style={[styles.skeleton, styles.skeletonTitle]} />
        <View style={[styles.skeleton, styles.skeletonLine]} />
        <View style={[styles.skeleton, styles.skeletonShort]} />
      </View>
    );
  }

  const mtbfText =
    metrics?.mtbfDays != null ? `${metrics.mtbfDays.toFixed(1)} días` : 'sin datos suficientes';

  const summary = metrics
    ? `${metrics.totalInterventions} intervenciones · ${fmtMoney(metrics.totalCost)} · MTBF: ${mtbfText}`
    : 'Sin datos';

  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.header} onPress={toggle} activeOpacity={0.8}>
        <Text style={styles.title}>Resumen de mantenimiento</Text>
        <Text style={styles.chevron}>{expanded ? '▾' : '▸'}</Text>
      </TouchableOpacity>

      {!expanded ? (
        <Text style={styles.summary}>{summary}</Text>
      ) : (
        <View style={styles.body}>
          <Metric label="Intervenciones totales" value={String(metrics?.totalInterventions ?? 0)} />
          <Metric label="Costo total" value={fmtMoney(metrics?.totalCost ?? 0)} />
          <Metric label="MTBF" value={mtbfText} />

          <View style={styles.typeRow}>
            <TypeCount label="Preventivas" value={metrics?.preventiveCount ?? 0} color="#606c38" />
            <TypeCount label="Correctivas" value={metrics?.correctiveCount ?? 0} color="#bc6c25" />
            <TypeCount label="Calibraciones" value={metrics?.calibrationCount ?? 0} color="#dda15e" />
          </View>

          <Metric
            label="Pieza más usada"
            value={
              metrics?.mostReplacedPartName
                ? `${metrics.mostReplacedPartName} (×${metrics.mostReplacedPartCount})`
                : '—'
            }
          />
        </View>
      )}
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function TypeCount({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.typeCount}>
      <Text style={[styles.typeCountValue, { color }]}>{value}</Text>
      <Text style={styles.typeCountLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.separator,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  chevron: { fontSize: 18, color: Colors.textSecondary },
  summary: { fontSize: 13, color: Colors.textSecondary, marginTop: Spacing.sm },
  body: { marginTop: Spacing.sm },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  metricLabel: { fontSize: 13, color: Colors.textSecondary },
  metricValue: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  typeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginVertical: Spacing.sm,
  },
  typeCount: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  typeCountValue: { fontSize: 18, fontWeight: '800' },
  typeCountLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  skeleton: {
    backgroundColor: Colors.background,
    borderRadius: Radius.sm,
    marginTop: Spacing.sm,
  },
  skeletonTitle: { height: 16, width: '60%', marginTop: 0 },
  skeletonLine: { height: 12, width: '90%' },
  skeletonShort: { height: 12, width: '40%' },
});
