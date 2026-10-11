// src/components/RuleProgressCard.tsx
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Colors, Radius, Spacing } from '../constants/theme';
import { MaintenanceRuleDTO, TriggerType } from '../types/rules';
import { CheckSquare, ChevronDown, ChevronUp, Clock, Cog, LucideIcon, MoreHorizontal, Spool } from 'lucide-react-native';

// Metadatos por tipo de disparo: ícono y título dinámico.
const TRIGGER_META: Record<TriggerType, { Icon: LucideIcon; title: (v: number) => string }> = {
  TIME_BASED: { Icon: Clock, title: v => `Cada ${v} días` },
  USAGE_HOURS: { Icon: Cog, title: v => `Cada ${v} hs de uso` },
  FILAMENT_GRAMS: { Icon: Spool, title: v => `Cada ${v}g de filamento` },
};

const MAINTENANCE_LABEL: Record<string, string> = {
  PREVENTIVE: 'Preventivo',
  CORRECTIVE: 'Correctivo',
  CALIBRATION: 'Calibración',
};

// Color de la barra según el % de progreso.
function barColor(progress: number): string {
  if (progress >= 90) return '#FF3B30';
  if (progress >= 70) return '#FF9500';
  return '#34C759';
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
  }, [animated, progress]);

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
        <View style={styles.iconBox}>
          <meta.Icon color={Colors.primary} size={18} />
        </View>
        <View style={styles.info}>
          <Text style={styles.title}>{meta.title(rule.triggerValue)}</Text>
          <Text style={styles.progressText}>{progressText}</Text>
          <Text style={styles.typeText}>
            Tipo: {MAINTENANCE_LABEL[rule.maintenanceType] ?? rule.maintenanceType}
          </Text>
        </View>
        <TouchableOpacity style={styles.menuBtn} onPress={onMenuPress} hitSlop={8}>
          <MoreHorizontal color={Colors.textSecondary} size={20} />
        </TouchableOpacity>
      </View>

      <View style={styles.track}>
        <Animated.View style={[styles.fill, { width, backgroundColor: barColor(progress) }]} />
      </View>

      <View style={styles.metaRow}>
        {showAlert ? <Text style={styles.alert}>Próximo mantenimiento</Text> : <View />}
        {!rule.active ? <Text style={styles.paused}>Pausada</Text> : null}
        <Text style={styles.percent}>{Math.round(progress)}%</Text>
      </View>

      {triggered && (
        <Text style={styles.triggeredText}>Condición alcanzada. Generando orden…</Text>
      )}

      <ChecklistPreview items={rule.checklistItems ?? []} />
    </Animated.View>
  );
}

// Checklist que se copia a la orden generada por la regla; colapsable.
function ChecklistPreview({ items }: { items: string[] }) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) {
    return <Text style={styles.checklistEmpty}>Sin checklist</Text>;
  }
  const Chevron = open ? ChevronUp : ChevronDown;
  return (
    <View style={styles.checklist}>
      <TouchableOpacity style={styles.checklistHeader} onPress={() => setOpen(o => !o)} hitSlop={6}>
        <CheckSquare color={Colors.textSecondary} size={14} />
        <Text style={styles.checklistTitle}>
          Checklist · {items.length} {items.length === 1 ? 'ítem' : 'ítems'}
        </Text>
        <Chevron color={Colors.textSecondary} size={16} />
      </TouchableOpacity>
      {open && items.map((item, i) => (
        <View key={i} style={styles.checklistRow}>
          <View style={styles.checklistBullet} />
          <Text style={styles.checklistItem}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  checklist: {
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.separator,
  },
  checklistHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  checklistTitle: { flex: 1, fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  checklistRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, marginTop: 6, paddingLeft: 2 },
  checklistBullet: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.primary, marginTop: 7 },
  checklistItem: { flex: 1, fontSize: 14, color: Colors.textPrimary, lineHeight: 19 },
  checklistEmpty: { marginTop: Spacing.sm, fontSize: 12, color: Colors.textTertiary },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  cardTriggered: {
    backgroundColor: Colors.errorBg,
    borderColor: 'transparent',
  },
  cardPaused: {
    opacity: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primaryTint,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.41,
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
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.fill,
    marginTop: Spacing.md,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  alert: {
    fontSize: 13,
    color: Colors.warningText,
    fontWeight: '600',
  },
  paused: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  percent: {
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    color: Colors.textPrimary,
  },
  triggeredText: {
    marginTop: Spacing.sm,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.errorText,
  },
});
