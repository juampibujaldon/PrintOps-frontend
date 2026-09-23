// src/components/history/HistoryTimeline.tsx
import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Colors, Radius, Spacing, Typography } from '../../constants/theme';
import { ORDER_STATUS, ORDER_TYPE } from '../../constants/orders';
import { OrderHistoryItem } from '../../types/printerHistory';
import Badge from '../ui/Badge';
import PressableScale from '../ui/PressableScale';

interface HistoryItemProps {
  order: OrderHistoryItem;
  isLast: boolean;
  onPress: (orderId: number) => void;
}

// Timestamp relativo para fechas recientes (< 30 días) y absoluto para antiguas.
function formatOrderDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffDays = Math.round((now.getTime() - date.getTime()) / 86_400_000);

  if (diffDays < 0) return 'hoy';
  if (diffDays === 0) return 'hoy';
  if (diffDays === 1) return 'hace 1 día';
  if (diffDays < 30) return `hace ${diffDays} días`;

  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${date.getDate()} ${months[date.getMonth()]}, ${date.getFullYear()}`;
}

function formatMoney(value: number): string {
  return `$${value.toFixed(2)}`;
}

export function HistoryItem({ order, isLast, onPress }: HistoryItemProps) {
  const typeMeta = ORDER_TYPE[order.type];
  const statusMeta = ORDER_STATUS[order.status];

  const metaParts = [formatOrderDate(order.createdAt)];
  if (order.actualMinutes != null) metaParts.push(`${order.actualMinutes} min`);
  if (order.technicianName) metaParts.push(order.technicianName);

  return (
    <View style={styles.itemRow}>
      {/* Columna del timeline: punto + línea conectora */}
      <View style={styles.timelineColumn}>
        <View style={[styles.dot, { backgroundColor: typeMeta.color }]} />
        {!isLast && <View style={styles.connector} />}
      </View>

      {/* Contenido del ítem */}
      <PressableScale style={styles.itemContent} onPress={() => onPress(order.id)}>
        <View style={styles.itemHeader}>
          <Badge label={typeMeta.label} color={typeMeta.color} />
          <Badge label={statusMeta.label} color={statusMeta.color} />
        </View>

        <Text style={styles.meta}>{metaParts.join(' · ')}</Text>

        {order.description && (
          <Text style={styles.description}>
            {typeMeta.label} — {order.description}
          </Text>
        )}

        {order.partsUsed.length > 0 && (
          <View style={styles.partsSection}>
            <Text style={styles.partsTitle}>Piezas:</Text>
            {order.partsUsed.map((p, i) => (
              <Text key={i} style={styles.partLine}>
                {p.partName} × {p.quantity} · {formatMoney(p.unitCost)}
              </Text>
            ))}
            {order.partsCost > 0 && (
              <Text style={styles.partsTotal}>Total piezas: {formatMoney(order.partsCost)}</Text>
            )}
          </View>
        )}

        {order.photoUrls.length > 0 && (
          <View style={styles.photosRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {order.photoUrls.map((url, i) => (
                <Image key={i} source={{ uri: url }} style={styles.thumbnail} />
              ))}
            </ScrollView>
            <Text style={styles.photoCount}>{order.photoUrls.length} foto{order.photoUrls.length > 1 ? 's' : ''}</Text>
          </View>
        )}

        <View style={styles.itemFooter}>
          <Text style={styles.orderNumber}>{order.orderNumber}</Text>
          <Text style={styles.detailLink}>Ver detalle →</Text>
        </View>
      </PressableScale>
    </View>
  );
}

interface HistoryTimelineProps {
  orders: OrderHistoryItem[];
  hasMore: boolean;
  isLoadingMore: boolean;
  onEndReached: () => void;
  onPressOrder: (orderId: number) => void;
  ListEmptyComponent?: React.ReactElement | null;
}

// Timeline vertical de órdenes (US-historial). FlatList con infinite scroll.
export default function HistoryTimeline({
  orders,
  hasMore,
  isLoadingMore,
  onEndReached,
  onPressOrder,
  ListEmptyComponent,
}: HistoryTimelineProps) {
  return (
    <FlatList
      data={orders}
      keyExtractor={item => String(item.id)}
      contentContainerStyle={styles.listContent}
      renderItem={({ item, index }) => (
        <HistoryItem
          order={item}
          isLast={index === orders.length - 1}
          onPress={onPressOrder}
        />
      )}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.4}
      ListEmptyComponent={ListEmptyComponent}
      ListFooterComponent={
        isLoadingMore ? (
          <ActivityIndicator color={Colors.accent} style={styles.footerSpinner} />
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: Spacing.md,
    paddingBottom: 40,
    flexGrow: 1,
  },
  itemRow: {
    flexDirection: 'row',
  },
  timelineColumn: {
    width: 24,
    alignItems: 'center',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 6,
  },
  connector: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.separator,
    marginTop: 4,
  },
  itemContent: {
    flex: 1,
    marginLeft: Spacing.sm,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.separator,
  },
  itemHeader: {
    flexDirection: 'row',
    gap: Spacing.xs,
    flexWrap: 'wrap',
    marginBottom: Spacing.xs,
  },
  meta: {
    ...Typography.footnote,
    color: Colors.textTertiary,
    marginBottom: Spacing.xs,
  },
  description: {
    ...Typography.subheadline,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  partsSection: {
    borderTopWidth: 1,
    borderTopColor: Colors.separator,
    paddingTop: Spacing.sm,
    marginTop: Spacing.xs,
  },
  partsTitle: {
    ...Typography.caption1,
    color: Colors.textTertiary,
    fontWeight: '700',
    marginBottom: 2,
  },
  partLine: {
    ...Typography.footnote,
    color: Colors.textSecondary,
    paddingVertical: 1,
  },
  partsTotal: {
    ...Typography.footnote,
    color: Colors.textPrimary,
    fontWeight: '700',
    marginTop: 2,
  },
  photosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: Radius.sm,
    marginRight: Spacing.xs,
    backgroundColor: Colors.separator,
  },
  photoCount: {
    ...Typography.caption2,
    color: Colors.textTertiary,
    flexShrink: 1,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  orderNumber: {
    ...Typography.caption2,
    color: Colors.textTertiary,
  },
  detailLink: {
    ...Typography.footnote,
    color: Colors.accent,
    fontWeight: '600',
  },
  footerSpinner: {
    paddingVertical: Spacing.lg,
  },
});
