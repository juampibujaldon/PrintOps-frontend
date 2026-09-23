// src/components/WearIndicator.tsx
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Spacing, Typography } from '../constants/theme';

type Props = {
  label: string;
  percent: number;
  hoursRemaining: number;
  critical: boolean;
};

// Color de la barra según el % usado (US-11).
function barColor(percent: number): string {
  if (percent >= 90) return '#E24B4A';
  if (percent >= 50) return '#dda15e';
  return '#606c38';
}

export default function WearIndicator({ label, percent, hoursRemaining, critical }: Props) {
  const width = useRef(new Animated.Value(0)).current;
  const clamped = Math.max(0, Math.min(100, percent));
  const color = barColor(percent);

  useEffect(() => {
    Animated.timing(width, {
      toValue: clamped,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [clamped, width]);

  const fillWidth = width.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.meta}>
          {Math.round(percent)}% usado · {Math.round(hoursRemaining)} horas restantes
        </Text>
      </View>

      <View style={styles.track}>
        <Animated.View style={[styles.fill, { width: fillWidth, backgroundColor: color }]} />
      </View>

      {critical && (
        <View style={styles.criticalBanner}>
          <Text style={styles.criticalText}>
            ⚠️ Cerca del límite — considerá reemplazarla antes del próximo trabajo
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  label: {
    ...Typography.subheadline,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  meta: {
    ...Typography.caption1,
    color: Colors.textSecondary,
  },
  track: {
    height: 10,
    borderRadius: Radius.full,
    backgroundColor: Colors.separator,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radius.full,
  },
  criticalBanner: {
    marginTop: Spacing.sm,
    backgroundColor: '#E24B4A18',
    borderWidth: 1,
    borderColor: '#E24B4A',
    borderRadius: Radius.sm,
    padding: Spacing.sm,
  },
  criticalText: {
    ...Typography.footnote,
    color: '#E24B4A',
    fontWeight: '600',
  },
});
