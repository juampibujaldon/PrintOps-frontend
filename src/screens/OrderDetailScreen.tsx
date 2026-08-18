// src/screens/OrderDetailScreen.tsx
import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image,
  ActivityIndicator, Alert, Modal,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Radius, Spacing, Typography } from '../constants/theme';
import { ORDER_STATUS } from '../constants/orders';
import { TecnicoStackParamList } from '../navigation/TecnicoStack';
import { orderService, OrderResponse, OrderStatus, StatusHistory } from '../services/orderService';
import { useAuth } from '../hooks/useAuth';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import TextField from '../components/ui/TextField';
import PressableScale from '../components/ui/PressableScale';

type Props = NativeStackScreenProps<TecnicoStackParamList, 'OrderDetail'>;

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
        <ActivityIndicator color={Colors.accent} />
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

  const status = ORDER_STATUS[order.status];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card style={styles.card}>
        <Text style={styles.type}>Orden #{order.id} · {order.type}</Text>
        <View style={styles.statusWrap}>
          <Badge label={status.label} color={status.color} />
        </View>

        {order.description && (
          <Text style={styles.description}>{order.description}</Text>
        )}

        <View style={styles.metaRow}>
          <Text style={styles.meta}>Estimado: {order.estimatedTimeMinutes ?? '-'} min</Text>
          <Text style={styles.meta}>Real: {order.actualTimeMinutes ?? '-'} min</Text>
        </View>
      </Card>

      <View style={styles.actions}>
        {isManager ? (
          <>
            {order.status === 'IN_REVIEW' && (
              <>
                <Button title="Aprobar" onPress={() => changeStatus('COMPLETED')} style={styles.actionButton} />
                <Button title="Rechazar" variant="danger" onPress={() => setRejectVisible(true)} style={styles.actionButton} />
              </>
            )}
            {(order.status === 'PENDING' || order.status === 'IN_PROGRESS' || order.status === 'IN_REVIEW') && (
              <Button title="Cancelar" variant="secondary" onPress={() => changeStatus('CANCELLED')} style={styles.actionButton} />
            )}
          </>
        ) : (
          <>
            {order.status === 'PENDING' && (
              <Button title="Comenzar" onPress={() => changeStatus('IN_PROGRESS')} style={styles.actionButton} />
            )}
            {order.status === 'IN_PROGRESS' && (
              <Button title="Enviar a revisión" onPress={() => changeStatus('IN_REVIEW')} style={styles.actionButton} />
            )}
            {(order.status === 'PENDING' || order.status === 'IN_PROGRESS') && (
              <Button title="Cancelar" variant="secondary" onPress={() => changeStatus('CANCELLED')} style={styles.actionButton} />
            )}
          </>
        )}
      </View>

      <Text style={styles.sectionTitle}>Historial</Text>
      <Card style={styles.card}>
        {history.map(h => (
          <View key={h.id} style={styles.timelineRow}>
            <View style={[styles.timelineDot, { backgroundColor: ORDER_STATUS[h.toStatus]?.color ?? Colors.statusUnknown }]} />
            <View style={styles.timelineInfo}>
              <Text style={styles.timelineStatus}>
                {h.fromStatus ? `${ORDER_STATUS[h.fromStatus]?.label ?? 'Desconocido'} → ` : ''}{ORDER_STATUS[h.toStatus]?.label ?? 'Desconocido'}
              </Text>
              {h.comment && <Text style={styles.timelineComment}>"{h.comment}"</Text>}
              <Text style={styles.timelineMeta}>
                {h.changedByName || 'Sistema'} · {new Date(h.changedAt).toLocaleString()}
              </Text>
            </View>
          </View>
        ))}
        {history.length === 0 && <Text style={styles.emptyText}>Sin cambios registrados</Text>}
      </Card>

      <Text style={styles.sectionTitle}>Checklist</Text>
      <Card style={styles.card}>
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
      </Card>

      <Text style={styles.sectionTitle}>Piezas</Text>
      <Card style={styles.card}>
        {order.parts.length === 0 && (
          <Text style={styles.emptyText}>Sin piezas registradas</Text>
        )}
        {order.parts.map(part => (
          <View key={part.id} style={styles.partRow}>
            <Text style={styles.partName}>{part.partName || part.partNumber || 'Pieza externa'}</Text>
            <Text style={styles.partQty}>x{part.quantity}</Text>
          </View>
        ))}
      </Card>

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

      <Modal visible={rejectVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Rechazar orden</Text>
            <TextField
              multiline
              placeholder="Comentario obligatorio (motivo del rechazo)..."
              value={rejectComment}
              onChangeText={setRejectComment}
              style={styles.commentInput}
            />
            <View style={styles.modalActions}>
              <PressableScale style={styles.modalCancel} onPress={() => setRejectVisible(false)}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </PressableScale>
              <Button title="Confirmar rechazo" variant="danger" onPress={confirmReject} />
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.lg,
    paddingBottom: 40,
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
  type: {
    ...Typography.title3,
    color: Colors.textPrimary,
    textTransform: 'capitalize',
  },
  statusWrap: {
    marginTop: Spacing.sm,
  },
  description: {
    ...Typography.subheadline,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  meta: {
    ...Typography.footnote,
    color: Colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    flexWrap: 'wrap',
  },
  actionButton: {
    flexGrow: 1,
    minWidth: 120,
  },
  sectionTitle: {
    ...Typography.labelUppercase,
    color: Colors.textTertiary,
    marginBottom: Spacing.sm,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  timelineInfo: {
    flex: 1,
  },
  timelineStatus: {
    ...Typography.subheadline,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  timelineComment: {
    ...Typography.footnote,
    color: Colors.accent,
    marginTop: 2,
    fontStyle: 'italic',
  },
  timelineMeta: {
    ...Typography.caption1,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 6,
  },
  checkbox: {
    ...Typography.body,
    color: Colors.accent,
    width: 24,
  },
  checkboxDone: {
    color: Colors.statusOperativa,
  },
  checklistText: {
    ...Typography.subheadline,
    color: Colors.textPrimary,
    flex: 1,
  },
  checklistTextMuted: {
    color: Colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  partRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  partName: {
    ...Typography.subheadline,
    color: Colors.textPrimary,
  },
  partQty: {
    ...Typography.subheadline,
    color: Colors.textSecondary,
    fontWeight: '700',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: Radius.sm,
  },
  emptyText: {
    ...Typography.subheadline,
    color: Colors.textSecondary,
    paddingVertical: Spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
  },
  modalTitle: {
    ...Typography.title3,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  commentInput: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    alignItems: 'center',
  },
  modalCancel: {
    padding: Spacing.md,
  },
  modalCancelText: {
    ...Typography.subheadline,
    color: Colors.accent,
    fontWeight: '600',
  },
});
