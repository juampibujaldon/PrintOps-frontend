// src/screens/OrderDetailScreen.tsx
import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../constants/theme';
import { TecnicoStackParamList } from '../navigation/TecnicoStack';
import { orderService, OrderResponse, OrderStatus } from '../services/orderService';
import { useAuth } from '../hooks/useAuth';

type Props = NativeStackScreenProps<TecnicoStackParamList, 'OrderDetail'>;

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Pendiente',
  IN_PROGRESS: 'En progreso',
  IN_REVIEW: 'En revisión',
  APPROVED: 'Aprobada',
  REJECTED: 'Rechazada',
  CANCELLED: 'Cancelada',
};

export default function OrderDetailScreen({ route }: Props) {
  const { orderId } = route.params;
  const { user } = useAuth();
  const isManager = user?.role === 'MANAGER';
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await orderService.getOrder(orderId);
      setOrder(data);
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'No se pudo cargar la orden');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [load])
  );

  const changeStatus = async (status: OrderStatus) => {
    try {
      const updated = await orderService.updateStatus(orderId, status);
      setOrder(updated);
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'No se pudo cambiar el estado');
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>No se encontró la orden</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.type}>{order.type}</Text>
        <View style={[styles.statusPill, { backgroundColor: Colors.primaryGlow }]}>
          <Text style={styles.statusText}>{STATUS_LABELS[order.status]}</Text>
        </View>

        {order.description && (
          <Text style={styles.description}>{order.description}</Text>
        )}

        <View style={styles.metaRow}>
          <Text style={styles.meta}>Estimado: {order.estimatedTimeMinutes ?? '-'} min</Text>
          <Text style={styles.meta}>Real: {order.actualTimeMinutes ?? '-'} min</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Checklist</Text>
      <View style={styles.card}>
        {order.checklistItems.length === 0 && (
          <Text style={styles.emptyText}>Sin ítems de checklist</Text>
        )}
        {order.checklistItems.map(item => (
          <View key={item.id} style={styles.checklistRow}>
            <Text style={[styles.checkbox, item.done && styles.checkboxDone]}>
              {item.done ? '✓' : item.na ? 'N/A' : '○'}
            </Text>
            <Text style={[styles.checklistText, (item.done || item.na) && styles.checklistTextMuted]}>
              {item.text}
            </Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Piezas</Text>
      <View style={styles.card}>
        {order.parts.length === 0 && (
          <Text style={styles.emptyText}>Sin piezas registradas</Text>
        )}
        {order.parts.map(part => (
          <View key={part.id} style={styles.partRow}>
            <Text style={styles.partName}>{part.partName || part.partNumber || 'Pieza externa'}</Text>
            <Text style={styles.partQty}>x{part.quantity}</Text>
          </View>
        ))}
      </View>

      {order.photos.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Fotos</Text>
          <View style={styles.photoGrid}>
            {order.photos.map(photo => (
              <Image key={photo.id} source={{ uri: photo.url }} style={styles.photo} />
            ))}
          </View>
        </>
      )}

      <View style={styles.actions}>
        {isManager ? (
          <>
            {order.status === 'IN_REVIEW' && (
              <>
                <TouchableOpacity style={styles.button} onPress={() => changeStatus('APPROVED')}>
                  <Text style={styles.buttonText}>Aprobar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={() => changeStatus('REJECTED')}>
                  <Text style={styles.buttonText}>Rechazar</Text>
                </TouchableOpacity>
              </>
            )}
            {(order.status === 'PENDING' || order.status === 'IN_PROGRESS' || order.status === 'IN_REVIEW') && (
              <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={() => changeStatus('CANCELLED')}>
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <>
            {order.status === 'PENDING' && (
              <TouchableOpacity style={styles.button} onPress={() => changeStatus('IN_PROGRESS')}>
                <Text style={styles.buttonText}>Comenzar</Text>
              </TouchableOpacity>
            )}
            {order.status === 'IN_PROGRESS' && (
              <TouchableOpacity style={styles.button} onPress={() => changeStatus('IN_REVIEW')}>
                <Text style={styles.buttonText}>Enviar a revisión</Text>
              </TouchableOpacity>
            )}
            {order.status === 'REJECTED' && (
              <TouchableOpacity style={styles.button} onPress={() => changeStatus('IN_PROGRESS')}>
                <Text style={styles.buttonText}>Retomar</Text>
              </TouchableOpacity>
            )}
            {(order.status === 'PENDING' || order.status === 'IN_PROGRESS') && (
              <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={() => changeStatus('CANCELLED')}>
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40, backgroundColor: Colors.background, flexGrow: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  card: { backgroundColor: Colors.inputBackground, padding: 16, borderRadius: 12, marginBottom: 16 },
  type: { fontSize: 20, fontWeight: 'bold', color: Colors.textPrimary, textTransform: 'capitalize' },
  statusPill: { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginTop: 8 },
  statusText: { color: Colors.primary, fontSize: 12, fontWeight: '700' },
  description: { color: Colors.textSecondary, fontSize: 14, marginTop: 10 },
  metaRow: { flexDirection: 'row', gap: 16, marginTop: 10 },
  meta: { color: Colors.textSecondary, fontSize: 13 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  checklistRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  checkbox: { fontSize: 16, color: Colors.accent, width: 24 },
  checkboxDone: { color: Colors.statusOperativa },
  checklistText: { fontSize: 15, color: Colors.textPrimary, flex: 1 },
  checklistTextMuted: { color: Colors.textSecondary, textDecorationLine: 'line-through' },
  partRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  partName: { fontSize: 15, color: Colors.textPrimary },
  partQty: { fontSize: 15, color: Colors.textSecondary, fontWeight: '700' },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photo: { width: 100, height: 100, borderRadius: 8 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  button: { flex: 1, backgroundColor: Colors.primary, padding: 14, borderRadius: 10, alignItems: 'center' },
  cancelButton: { backgroundColor: Colors.error },
  buttonText: { color: Colors.background, fontWeight: '700' },
  emptyText: { color: Colors.textSecondary, fontSize: 14, paddingVertical: 8 },
});
