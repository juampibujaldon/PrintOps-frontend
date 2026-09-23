// src/components/RuleProgressCard.tsx
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Colors, Radius, Spacing } from '../constants/theme';
import { MaintenanceRuleDTO, TriggerType } from '../types/rules';

// Metadatos por tipo de disparo: ícono y título dinámico.
const TRIGGER_META: Record<TriggerType, { icon: string; title: (v: number) => string }> = {
  TIME_BASED: { icon: '🕐', title: v => `Cada ${v} días` },
  USAGE_HOURS: { icon: '⚙️', title: v => `Cada ${v} hs de uso` },
  FILAMENT_GRAMS: { icon: '🧵', title: v => `Cada ${v}g de filamento` },
};

const MAINTENANCE_LABEL: Record<string, string> = {
  PREVENTIVE: 'Preventivo',
  CORRECTIVE: 'Correctivo',
  CALIBRATION: 'Calibración',
};

// Color de la barra según el % de progreso.
function barColor(progress: number): string {
  if (progress >= 90) return '#bc6c25'; // rojo (copperwood)
  if (progress >= 70) return '#dda15e'; // amarillo (sunlit_clay)
  return '#606c38'; // verde (olive)
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const target = new Date(iso + 'T00:00:00').getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target - today.getTime()) / 86400000);
}

// Props: { rule, onMenuPress }
export default function RuleProgressCard({
  rule,
  onMenuPress,
}: {
  rule: MaintenanceRuleDTO;
  onMenuPress: () => void;
}) {
  const meta = TRIGGER_META[rule.triggerType];
  const progress = Math.max(0, Math.min(100, rule.progressPercent ?? 0));
  const animated = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animated, {
      toValue: progress,
      duration: 700,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const remaining = rule.triggerType === 'TIME_BASED' ? daysUntil(rule.nextTriggerEstimate) : null;
  const showAlert =
    remaining !== null && remaining >= 0 && remaining <= (rule.alertDaysBefore ?? 7) && progress < 100;
  const triggered = progress >= 100;

  const progressText = (() => {
    switch (rule.triggerType) {
      case 'TIME_BASED':
        return rule.nextTriggerEstimate
          ? `Próximo: ${formatDate(rule.nextTriggerEstimate)} · en ${Math.max(0, remaining ?? 0)} días`
          : 'Sin fecha estimada';
      case 'USAGE_HOURS':
        return `Uso actual: ${Math.round(rule.currentValue ?? 0)}hs / ${rule.triggerValue}hs`;
      case 'FILAMENT_GRAMS':
        return `Consumido: ${Math.round(rule.currentValue ?? 0)}g / ${rule.triggerValue}g`;
      default:
        return '';
    }
  })();

  const width = animated.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });

  return (
    <Animated.View
      style={[
        styles.card,
        triggered && styles.cardTriggered,
        !rule.active && styles.cardPaused,
      ]}
    >
      <View style={styles.row}>
        <Text style={styles.icon}>{meta.icon}</Text>
        <View style={styles.info}>
          <Text style={styles.title}>{meta.title(rule.triggerValue)}</Text>
          <Text style={styles.progressText}>{progressText}</Text>
          <Text style={styles.typeText}>
            Tipo: {MAINTENANCE_LABEL[rule.maintenanceType] ?? rule.maintenanceType}
          </Text>
        </View>
        <TouchableOpacity style={styles.menuBtn} onPress={onMenuPress} hitSlop={8}>
          <Text style={styles.menuText}>···</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.track}>
        <Animated.View style={[styles.fill, { width, backgroundColor: barColor(progress) }]} />
      </View>

      <View style={styles.metaRow}>
        {showAlert ? <Text style={styles.alert}>⚠️ Próximo mantenimiento</Text> : <View />}
        {!rule.active ? <Text style={styles.paused}>Pausada</Text> : null}
        <Text style={styles.percent}>{Math.round(progress)}%</Text>
      </View>

      {triggered && (
        <Text style={styles.triggeredText}>⚠️ Condición alcanzada — generando orden...</Text>
      )}
    </Animated.View>
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
  cardTriggered: {
    backgroundColor: '#fbe9e7',
    borderColor: '#bc6c25',
  },
  cardPaused: {
    opacity: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 26,
    marginRight: Spacing.md,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  progressText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  typeText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  menuBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  menuText: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.background,
    marginTop: Spacing.md,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  alert: {
    fontSize: 12,
    color: '#bc6c25',
    fontWeight: '700',
  },
  paused: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  percent: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  triggeredText: {
    marginTop: Spacing.sm,
    fontSize: 13,
    fontWeight: '700',
    color: '#bc6c25',
  },
});
