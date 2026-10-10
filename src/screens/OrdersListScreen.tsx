// src/screens/OrdersListScreen.tsx
import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Alert, RefreshControl, Pressable,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { ChevronRight, ClipboardList } from 'lucide-react-native';
import { Colors, Radius, Spacing, Typography } from '../constants/theme';
import { ORDER_STATUS, ORDER_TYPE } from '../constants/orders';
import { TecnicoStackParamList } from '../navigation/TecnicoStack';
import { orderService, OrderResponse } from '../services/orderService';
import { formatTimestamp } from '../utils/formatDate';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import Skeleton from '../components/ui/Skeleton';

type Props = NativeStackScreenProps<TecnicoStackParamList, 'OrdersList'>;

export default function OrdersListScreen({ navigation }: Props) {
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await orderService.listOrders();
      setOrders(data);
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'No se pudieron cargar las órdenes');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        {[0, 1, 2, 3].map(i => <Skeleton key={i} style={styles.skeleton} />)}
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      data={orders}
      keyExtractor={item => String(item.id)}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.textTertiary} />}
      ListEmptyComponent={
        <EmptyState
          icon={<ClipboardList color={Colors.textTertiary} size={44} strokeWidth={1.5} />}
          title="Sin órdenes"
          description="Las órdenes de mantenimiento aparecerán acá."
        />
      }
      renderItem={({ item, index }) => {
        const status = ORDER_STATUS[item.status];
        const first = index === 0;
        const last = index === orders.length - 1;
        return (
          <Pressable
            onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })}
            style={({ pressed }) => [
              styles.row,
              first && styles.rowFirst,
              last && styles.rowLast,
              pressed && styles.rowPressed,
            ]}
          >
            <View style={[styles.rowInner, !last && styles.separator]}>
              <View style={styles.rowText}>
                <View style={styles.titleRow}>
                  <Text style={styles.title}>Orden #{item.id}</Text>
                  <Text style={styles.date}>{formatTimestamp(item.createdAt)}</Text>
                </View>
                <Text style={styles.meta} numberOfLines={1}>
                  {ORDER_TYPE[item.type]?.label ?? item.type}
                  {' · '}
                  {item.assignedToName ?? 'Sin asignar'}
                </Text>
                <View style={styles.badgeRow}>
                  <Badge label={status.label} color={status.color} pulse={item.status === 'IN_PROGRESS'} />
                </View>
              </View>
              <ChevronRight color={Colors.textTertiary} size={18} />
            </View>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { backgroundColor: Colors.background },
  container: {
    padding: Spacing.lg,
    backgroundColor: Colors.background,
    flexGrow: 1,
  },
  skeleton: { height: 84, borderRadius: Radius.lg, marginBottom: Spacing.sm },
  row: { backgroundColor: Colors.surface, paddingLeft: Spacing.lg },
  rowFirst: { borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg },
  rowLast: { borderBottomLeftRadius: Radius.lg, borderBottomRightRadius: Radius.lg },
  rowPressed: { backgroundColor: Colors.fill },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingRight: Spacing.md,
    gap: Spacing.sm,
  },
  separator: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.separator },
  rowText: { flex: 1 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: Spacing.sm },
  title: { ...Typography.headline, color: Colors.textPrimary },
  date: { ...Typography.footnote, color: Colors.textSecondary },
  meta: { ...Typography.subheadline, color: Colors.textSecondary, marginTop: 2 },
  badgeRow: { marginTop: Spacing.sm },
});
