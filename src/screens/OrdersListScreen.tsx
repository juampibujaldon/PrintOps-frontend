// src/screens/OrdersListScreen.tsx
import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator, Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, Typography } from '../constants/theme';
import { ORDER_STATUS } from '../constants/orders';
import { TecnicoStackParamList } from '../navigation/TecnicoStack';
import { orderService, OrderResponse } from '../services/orderService';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import PressableScale from '../components/ui/PressableScale';

type Props = NativeStackScreenProps<TecnicoStackParamList, 'OrdersList'>;

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
        <ActivityIndicator color={Colors.accent} />
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
        const status = ORDER_STATUS[item.status];
        return (
          <PressableScale onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })}>
            <Card style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.orderType}>#{item.id} · {item.type}</Text>
                <Badge label={status.label} color={status.color} />
              </View>
              <Text style={styles.meta}>
                {item.assignedToName ? `Asignada a: ${item.assignedToName}` : 'Sin asignar'}
                {'\n'}Creada: {new Date(item.createdAt).toLocaleDateString()}
              </Text>
            </Card>
          </PressableScale>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
    backgroundColor: Colors.background,
    flexGrow: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  card: {
    marginBottom: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  orderType: {
    ...Typography.headline,
    color: Colors.textPrimary,
    textTransform: 'capitalize',
    flexShrink: 1,
  },
  meta: {
    ...Typography.footnote,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  emptyText: {
    ...Typography.subheadline,
    color: Colors.textSecondary,
  },
});
