// src/components/StatusTimeline.tsx
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Colors, Spacing, Typography } from '../constants/theme';
import { ORDER_STATUS } from '../constants/orders';
import { StatusHistory } from '../services/orderService';
import { formatTimestamp } from '../utils/formatDate';

// Etiquetas legibles para los roles del proyecto (US-05).
const ROLE_LABELS: Record<string, string> = {
  MANAGER: 'Supervisor',
  TECNICO: 'Técnico',
};

type Props = {
  history: StatusHistory[];
};

// Timeline vertical reutilizable de cambios de estado.
// El primer ítem (más reciente) tiene el dot pulsante.
export default function StatusTimeline({ history }: Props) {
  if (history.length === 0) {
    return <Text style={styles.empty}>Sin cambios registrados</Text>;
  }

  return (
    <View>
      {history.map((item, index) => (
        <TimelineItem
          key={item.id}
          item={item}
          isLatest={index === 0}
          isLast={index === history.length - 1}
        />
      ))}
    </View>
  );
}

function TimelineItem({
  item,
  isLatest,
  isLast,
}: {
  item: StatusHistory;
  isLatest: boolean;
  isLast: boolean;
}) {
  const anim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isLatest) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.35, duration: 900, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [isLatest, anim]);

  const status = ORDER_STATUS[item.toStatus];
  const color = status?.color ?? Colors.statusUnknown;
  const label = status?.label ?? item.toStatus;
  const roleLabel = item.changedByRole ? ROLE_LABELS[item.changedByRole] ?? item.changedByRole : undefined;
  const actor = item.changedByName ?? 'Sistema';

  return (
    <View style={styles.row}>
      <View style={styles.timelineColumn}>
        <Animated.View
          style={[styles.dot, { backgroundColor: color, opacity: isLatest ? anim : 1 }]}
        />
        {!isLast && <View style={styles.line} />}
      </View>
      <View style={[styles.content, !isLast && styles.contentSpaced]}>
        <Text style={styles.status}>{label}</Text>
        <Text style={styles.meta}>
          {formatTimestamp(item.changedAt)} · {actor}
          {roleLabel ? ` (${roleLabel})` : ''}
        </Text>
        {item.comment ? (
          <View style={styles.commentBox}>
            <Text style={styles.commentText}>"{item.comment}"</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  timelineColumn: {
    alignItems: 'center',
    width: 16,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  line: {
    flex: 1,
    width: 2,
    backgroundColor: Colors.separator,
    marginVertical: 2,
  },
  content: {
    flex: 1,
    paddingLeft: Spacing.sm,
  },
  contentSpaced: {
    paddingBottom: Spacing.md,
  },
  status: {
    ...Typography.subheadline,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  meta: {
    ...Typography.caption1,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  commentBox: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: Spacing.sm,
    marginTop: Spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: Colors.error,
  },
  commentText: {
    ...Typography.footnote,
    color: Colors.textPrimary,
    fontStyle: 'italic',
  },
  empty: {
    ...Typography.subheadline,
    color: Colors.textSecondary,
    paddingVertical: Spacing.sm,
  },
});
