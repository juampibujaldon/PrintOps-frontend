// src/components/history/MetricsSummary.tsx
import React, { useState } from 'react';
import { LayoutAnimation, Platform, StyleSheet, Text, UIManager, View } from 'react-native';
import { Colors, Radius, Spacing, Typography } from '../../constants/theme';
import { PrinterMetrics } from '../../types/printerHistory';
import Card from '../ui/Card';
import PressableScale from '../ui/PressableScale';

// LayoutAnimation no funciona en Android sin habilitar este flag.
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface MetricsSummaryProps {
  metrics: PrinterMetrics;
  printerName: string;
  totalHours: number;
}

function money(value: number): string {
  return `$${value.toFixed(2)}`;
}

// Panel colapsable con las métricas principales de la impresora (US-historial).
export default function MetricsSummary({ metrics, printerName, totalHours }: MetricsSummaryProps) {
  const [expanded, setExpanded] = useState(true);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(prev => !prev);
  };

  const mtbfText = metrics.mtbfDays == null ? 'sin datos suficientes' : `${metrics.mtbfDays} días`;

  return (
    <Card style={styles.card}>
      <PressableScale onPress={toggle}>
        {expanded ? (
          <View style={styles.expanded}>
            <View style={styles.headerRow}>
              <Text style={styles.title}>{printerName}</Text>
              <Text style={styles.chevron}>▾</Text>
            </View>

            <View style={styles.highlightRow}>
              <Text style={styles.highlightValue}>{metrics.totalInterventions} intervenciones</Text>
              <Text style={styles.highlightValue}>{money(metrics.totalCost)} total</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.row}>
              <Text style={styles.label}>MTBF</Text>
              <Text style={styles.value}>
                {metrics.mtbfDays == null ? 'sin datos suficientes' : `${mtbfText} entre fallas`}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Preventivos</Text>
              <Text style={styles.value}>{metrics.preventiveCount}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Correctivos</Text>
              <Text style={styles.value}>{metrics.correctiveCount}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Calibraciones</Text>
              <Text style={styles.value}>{metrics.calibrationCount}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Pieza más usada</Text>
              <Text style={styles.value}>
                {metrics.mostReplacedPartName
                  ? `${metrics.mostReplacedPartName} (x${metrics.mostReplacedPartCount})`
                  : 'sin piezas'}
              </Text>
            </View>

            {totalHours != null && (
              <Text style={styles.hours}>{totalHours} horas de impresión acumuladas</Text>
            )}
          </View>
        ) : (
          <View style={styles.collapsed}>
            <Text style={styles.collapsedText} numberOfLines={1}>
              {metrics.totalInterventions} intervenciones · {money(metrics.totalCost)} · MTBF{' '}
              {metrics.mtbfDays == null ? 's/d' : `${metrics.mtbfDays}d`}
            </Text>
            <Text style={styles.chevron}>▸</Text>
          </View>
        )}
      </PressableScale>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.md,
  },
  expanded: {},
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  title: {
    ...Typography.headline,
    color: Colors.textPrimary,
  },
  chevron: {
    ...Typography.title3,
    color: Colors.textTertiary,
  },
  highlightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  highlightValue: {
    ...Typography.title3,
    color: Colors.textPrimary,
    flexShrink: 1,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.separator,
    marginVertical: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  label: {
    ...Typography.subheadline,
    color: Colors.textSecondary,
  },
  value: {
    ...Typography.subheadline,
    color: Colors.textPrimary,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
  hours: {
    ...Typography.caption1,
    color: Colors.textTertiary,
    marginTop: Spacing.sm,
  },
  collapsed: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  collapsedText: {
    ...Typography.subheadline,
    color: Colors.textPrimary,
    flex: 1,
    marginRight: Spacing.sm,
  },
});
