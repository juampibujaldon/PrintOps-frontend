// src/components/HistoryTimeline.tsx
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Colors, Radius, Spacing } from '../constants/theme';
import { OrderHistoryItemDTO, OrderType } from '../types/history';

// Badge de tipo: olive / copperwood / sunlit_clay.
const TYPE_BADGE: Record<OrderType, { color: string; label: string }> = {
  PREVENTIVE: { color: '#606c38', label: 'Preventivo' },
  CORRECTIVE: { color: '#bc6c25', label: 'Correctivo' },
  CALIBRATION: { color: '#dda15e', label: 'Calibración' },
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendiente',
  IN_PROGRESS: 'En curso',
  IN_REVIEW: 'En revisión',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
};

// Timestamp: relativo si < 30 días, absoluto si mayor.
function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const diffDays = (Date.now() - d.getTime()) / 86400000;
  if (diffDays >= 0 && diffDays < 30) {
    if (diffDays < 1) {
      const hours = diffDays * 24;
      if (hours < 1) return 'hace unos minutos';
      return `hace ${Math.floor(hours)} h`;
    }
    return `hace ${Math.floor(diffDays)} días`;
  }
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function TimelineItem({
  order,
  isLast,
  onPressDetail,
}: {
  order: OrderHistoryItemDTO;
  isLast: boolean;
  onPressDetail: (order: OrderHistoryItemDTO) => void;
}) {
  const badge = TYPE_BADGE[order.type] ?? { color: Colors.textSecondary, label: order.type };

  const partsText = order.partsUsed
    .map(p => `${p.quantity}× ${p.partName ?? p.partNumber ?? 'genérica'}`)
    .join(', ');

  return (
    <View style={styles.itemRow}>
      {/* Riel conector vertical */}
      <View style={styles.rail}>
        <View style={[styles.dot, { backgroundColor: badge.color }]} />
        {!isLast && <View style={styles.line} />}
      </View>

      <View style={styles.itemCard}>
        <View style={styles.itemHeader}>
          <View style={[styles.badge, { backgroundColor: badge.color }]}>
            <Text style={styles.badgeText}>{badge.label}</Text>
          </View>
          <Text style={styles.timestamp}>{formatTimestamp(order.createdAt)}</Text>
        </View>

        <Text style={styles.orderNumber}>
          {order.orderNumber} · {STATUS_LABEL[order.status] ?? order.status}
        </Text>

        {order.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {order.description}
          </Text>
        ) : null}

        {partsText ? <Text style={styles.partsText}>Piezas: {partsText}</Text> : null}

        {order.photoUrls.length > 0 ? (
          <View style={styles.photosRow}>
            {order.photoUrls.slice(0, 4).map((url, i) => (
              <Image key={i} source={{ uri: url }} style={styles.thumb} />
            ))}
          </View>
        ) : null}

        <TouchableOpacity style={styles.detailBtn} onPress={() => onPressDetail(order)}>
          <Text style={styles.detailText}>Ver detalle →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

type Props = {
  orders: OrderHistoryItemDTO[];
  refreshing: boolean;
  onRefresh: () => void;
  onEndReached: () => void;
  isLoadingMore: boolean;
  header?: React.ReactElement;
  empty?: React.ReactElement;
  onPressDetail: (order: OrderHistoryItemDTO) => void;
};

export default function HistoryTimeline({
  orders,
  refreshing,
  onRefresh,
  onEndReached,
  isLoadingMore,
  header,
  empty,
  onPressDetail,
}: Props) {
  return (
    <FlatList
      data={orders}
      keyExtractor={o => String(o.id)}
      renderItem={({ item, index }) => (
        <TimelineItem order={item} isLast={index === orders.length - 1} onPressDetail={onPressDetail} />
      )}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      ListFooterComponent={
        isLoadingMore ? (
          <ActivityIndicator style={{ marginVertical: Spacing.md }} color={Colors.primary} />
        ) : null
      }
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.4}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  listContent: { padding: Spacing.lg, paddingBottom: 40 },
  itemRow: { flexDirection: 'row' },
  rail: { alignItems: 'center', width: 20, marginRight: Spacing.sm },
  dot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  line: { flex: 1, width: 2, backgroundColor: Colors.surfaceBorder },
  itemCard: {
    flex: 1,
    backgroundColor: Colors.surfaceBase,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  itemHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  badge: { borderRadius: Radius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  timestamp: { fontSize: 12, color: Colors.textSecondary },
  orderNumber: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginBottom: 2 },
  description: { fontSize: 13, color: Colors.textSecondary, marginBottom: Spacing.sm, lineHeight: 18 },
  partsText: { fontSize: 12, color: Colors.textSecondary, marginBottom: Spacing.sm },
  photosRow: { flexDirection: 'row', gap: Spacing.xs, marginBottom: Spacing.sm },
  thumb: { width: 48, height: 48, borderRadius: Radius.sm },
  detailBtn: { alignSelf: 'flex-start' },
  detailText: { color: Colors.accent, fontSize: 13, fontWeight: '700' },
});
