// src/screens/OrderDetailScreen.tsx
import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image,
  ActivityIndicator, Alert, Modal, TextInput,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../constants/theme';
import { TecnicoStackParamList } from '../navigation/TecnicoStack';
import { orderService, OrderResponse, OrderStatus, StatusHistory } from '../services/orderService';
import { useAuth } from '../hooks/useAuth';

type Props = NativeStackScreenProps<TecnicoStackParamList, 'OrderDetail'>;

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Pendiente',
  IN_PROGRESS: 'En progreso',
  IN_REVIEW: 'En revisión',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
};

// Colores semánticos para el badge (US-05).
const STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING: '#6b7280',
  IN_PROGRESS: '#3b82f6',
  IN_REVIEW: '#f59e0b',
  COMPLETED: '#10b981',
  CANCELLED: '#ef4444',
};

export default function OrderDetailScreen({ route }: Props) {
  const { orderId } = route.params;
  const { user } = useAuth();
  const isManager = user?.role === 'MANAGER';

  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [history, setHistory] = useState<StatusHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectVisible, setRejectVisible] = useState(false);
  const [rejectComment, setRejectComment] = useState('');

  const load = useCallback(async () => {
    try {
      const [o, h] = await Promise.all([
        orderService.getOrder(orderId),
        orderService.getHistory(orderId),
      ]);
      setOrder(o);
      setHistory(h);
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

  const changeStatus = async (status: OrderStatus, comment?: string) => {
    try {
      await orderService.updateStatus(orderId, status, comment);
      setRejectVisible(false);
      setRejectComment('');
      await load();
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'No se pudo cambiar el estado');
    }
  };

  const confirmReject = () => {
    if (!rejectComment.trim()) {
      Alert.alert('Atención', 'El comentario es obligatorio para rechazar.');
      return;
    }
    changeStatus('IN_PROGRESS', rejectComment.trim());
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

  const statusColor = STATUS_COLORS[order.status] ?? '#6b7280';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Cabecera con estado prominente */}
      <View style={styles.card}>
        <Text style={styles.type}>Orden #{order.id} · {order.type}</Text>
        <View style={[styles.statusPill, { backgroundColor: statusColor + '22', borderColor: statusColor }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{STATUS_LABELS[order.status] ?? 'Desconocido'}</Text>
        </View>

        {order.description && (
          <Text style={styles.description}>{order.description}</Text>
        )}

        <View style={styles.metaRow}>
          <Text style={styles.meta}>Estimado: {order.estimatedTimeMinutes ?? '-'} min</Text>
          <Text style={styles.meta}>Real: {order.actualTimeMinutes ?? '-'} min</Text>
        </View>
      </View>

      {/* Acciones (elemento prominente) */}
      <View style={styles.actions}>
        {isManager ? (
          <>
            {order.status === 'IN_REVIEW' && (
              <>
                <TouchableOpacity style={styles.button} onPress={() => changeStatus('COMPLETED')}>
                  <Text style={styles.buttonText}>Aprobar ✓</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, styles.rejectButton]} onPress={() => setRejectVisible(true)}>
                  <Text style={styles.buttonText}>Rechazar ✗</Text>
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
            {(order.status === 'PENDING' || order.status === 'IN_PROGRESS') && (
              <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={() => changeStatus('CANCELLED')}>
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      {/* Historial (timeline) */}
      <Text style={styles.sectionTitle}>Historial</Text>
      <View style={styles.card}>
        {history.map(h => (
          <View key={h.id} style={styles.timelineRow}>
            <View style={[styles.timelineDot, { backgroundColor: STATUS_COLORS[h.toStatus] ?? '#6b7280' }]} />
            <View style={styles.timelineInfo}>
              <Text style={styles.timelineStatus}>
                {h.fromStatus ? `${STATUS_LABELS[h.fromStatus] ?? 'Desconocido'} → ` : ''}{STATUS_LABELS[h.toStatus] ?? 'Desconocido'}
              </Text>
              {h.comment && <Text style={styles.timelineComment}>"{h.comment}"</Text>}
              <Text style={styles.timelineMeta}>
                {h.changedByName || 'Sistema'} · {new Date(h.changedAt).toLocaleString()}
              </Text>
            </View>
          </View>
        ))}
        {history.length === 0 && <Text style={styles.emptyText}>Sin cambios registrados</Text>}
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

      {/* Bottom sheet de rechazo */}
      <Modal visible={rejectVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Rechazar orden</Text>
            <TextInput
              style={styles.commentInput}
              multiline
              placeholder="Comentario obligatorio (motivo del rechazo)..."
              value={rejectComment}
              onChangeText={setRejectComment}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setRejectVisible(false)}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.button} onPress={confirmReject}>
                <Text style={styles.buttonText}>Confirmar rechazo</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40, backgroundColor: Colors.background, flexGrow: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  card: { backgroundColor: Colors.inputBackground, padding: 16, borderRadius: 12, marginBottom: 16 },
  type: { fontSize: 20, fontWeight: 'bold', color: Colors.textPrimary, textTransform: 'capitalize' },
  statusPill: { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginTop: 8, borderWidth: 1 },
  statusText: { fontSize: 13, fontWeight: '700' },
  description: { color: Colors.textSecondary, fontSize: 14, marginTop: 10 },
  metaRow: { flexDirection: 'row', gap: 16, marginTop: 10 },
  meta: { color: Colors.textSecondary, fontSize: 13 },
  actions: { flexDirection: 'row', gap: 10, marginBottom: 16, flexWrap: 'wrap' },
  button: { flexGrow: 1, backgroundColor: Colors.primary, padding: 16, borderRadius: 10, alignItems: 'center' },
  rejectButton: { backgroundColor: Colors.error },
  cancelButton: { backgroundColor: Colors.textSecondary },
  buttonText: { color: Colors.background, fontWeight: '700' },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  timelineRow: { flexDirection: 'row', gap: 10, paddingVertical: 8 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  timelineInfo: { flex: 1 },
  timelineStatus: { fontSize: 15, color: Colors.textPrimary, fontWeight: '600' },
  timelineComment: { fontSize: 13, color: Colors.accent, marginTop: 2, fontStyle: 'italic' },
  timelineMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
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
  emptyText: { color: Colors.textSecondary, fontSize: 14, paddingVertical: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: Colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: 16 },
  commentInput: {
    borderWidth: 1, borderColor: Colors.surfaceBorder, borderRadius: 10, padding: 12,
    minHeight: 90, textAlignVertical: 'top', backgroundColor: Colors.inputBackground, color: Colors.textPrimary,
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16, alignItems: 'center' },
  modalCancel: { padding: 14 },
  modalCancelText: { color: Colors.accent, fontWeight: '600' },
});
