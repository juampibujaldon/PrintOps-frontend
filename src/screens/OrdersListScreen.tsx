// src/screens/OrdersListScreen.tsx
import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../constants/theme';
import { TecnicoStackParamList } from '../navigation/TecnicoStack';
import { orderService, OrderResponse, OrderStatus } from '../services/orderService';

type Props = NativeStackScreenProps<TecnicoStackParamList, 'OrdersList'>;

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Pendiente',
  IN_PROGRESS: 'En progreso',
  IN_REVIEW: 'En revisión',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING: '#6b7280',
  IN_PROGRESS: '#3b82f6',
  IN_REVIEW: '#f59e0b',
  COMPLETED: '#10b981',
  CANCELLED: '#ef4444',
};

export default function OrdersListScreen({ navigation }: Props) {
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      data={orders}
      keyExtractor={item => String(item.id)}
      contentContainerStyle={styles.container}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.emptyText}>Sin órdenes</Text>
        </View>
      }
      renderItem={({ item }) => {
        const color = STATUS_COLORS[item.status] ?? '#6b7280';
        return (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.orderType}>#{item.id} · {item.type}</Text>
              <View style={[styles.badge, { backgroundColor: color + '22', borderColor: color }]}>
                <Text style={[styles.badgeText, { color }]}>{STATUS_LABELS[item.status] ?? 'Desconocido'}</Text>
              </View>
            </View>
            <Text style={styles.meta}>
              {item.assignedToName ? `Asignada a: ${item.assignedToName}` : 'Sin asignar'}
              {'\n'}Creada: {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: Colors.background, flexGrow: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  card: { backgroundColor: Colors.inputBackground, padding: 16, borderRadius: 12, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  orderType: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, textTransform: 'capitalize' },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  meta: { color: Colors.textSecondary, fontSize: 13 },
  emptyText: { color: Colors.textSecondary, fontSize: 14 },
});
