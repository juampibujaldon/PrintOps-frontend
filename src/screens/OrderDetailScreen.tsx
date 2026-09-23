// src/screens/OrderDetailScreen.tsx
import React, { useCallback, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image,
  ActivityIndicator, Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { BottomSheetModal, BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Colors, Radius, Spacing, Typography } from '../constants/theme';
import { ORDER_STATUS } from '../constants/orders';
import { TecnicoStackParamList } from '../navigation/TecnicoStack';
import { orderService, OrderResponse, OrderStatus, StatusHistory } from '../services/orderService';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../context/ToastContext';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import TextField from '../components/ui/TextField';
import PressableScale from '../components/ui/PressableScale';
import StatusTimeline from '../components/StatusTimeline';

type Props = NativeStackScreenProps<TecnicoStackParamList, 'OrderDetail'>;

const MIN_REJECT_CHARS = 10;

export default function OrderDetailScreen({ route }: Props) {
  const { orderId } = route.params;
  const { user } = useAuth();
  const { showToast } = useToast();
  const isManager = user?.role === 'MANAGER';

  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [history, setHistory] = useState<StatusHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectComment, setRejectComment] = useState('');
  const rejectSheetRef = useRef<BottomSheetModal>(null);

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

  const changeStatus = async (status: OrderStatus, comment?: string, successMessage?: string) => {
    try {
      await orderService.updateStatus(orderId, status, comment);
      if (successMessage) showToast(successMessage);
      rejectSheetRef.current?.dismiss();
      setRejectComment('');
      await load();
    } catch (error: any) {
      // FIX 4: 409 = conflicto de concurrencia en el stock (optimistic lock).
      if (error?.response?.status === 409) {
        Alert.alert('Conflicto', 'El stock fue modificado por otro proceso. Recargá e intentá de nuevo.');
      } else {
        Alert.alert('Error', error?.response?.data?.message || 'No se pudo cambiar el estado');
      }
    }
  };

  // Confirmación previa a cada PATCH (excepto rechazo, que usa el bottom sheet).
  const confirmAction = (title: string, message: string, status: OrderStatus, successMessage: string) => {
    Alert.alert(title, message, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Confirmar', onPress: () => changeStatus(status, undefined, successMessage) },
    ]);
  };

  const confirmReject = () => {
    if (rejectComment.trim().length < MIN_REJECT_CHARS) return;
    changeStatus('IN_PROGRESS', rejectComment.trim(), 'Orden devuelta al técnico');
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
    <BottomSheetModalProvider>
      <ScrollView contentContainerStyle={styles.container}>
        <Card style={styles.card}>
          <Text style={styles.type}>Orden #{order.id} · {order.type}</Text>
          <View style={styles.statusWrap}>
            <Badge label={status.label} color={status.color} pulse={order.status === 'IN_REVIEW'} />
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
                  <Button
                    title="Aprobar ✓"
                    onPress={() => confirmAction('Aprobar orden', '¿Confirmás la aprobación y cierre de esta orden?', 'COMPLETED', 'Orden aprobada')}
                    style={styles.actionButton}
                  />
                  <Button
                    title="Rechazar ✗"
                    variant="danger"
                    onPress={() => rejectSheetRef.current?.present()}
                    style={styles.actionButton}
                  />
                </>
              )}
              {(order.status === 'PENDING' || order.status === 'IN_PROGRESS' || order.status === 'IN_REVIEW') && (
                <Button
                  title="Cancelar"
                  variant="secondary"
                  onPress={() => confirmAction('Cancelar orden', '¿Confirmás la cancelación de esta orden?', 'CANCELLED', 'Orden cancelada')}
                  style={styles.actionButton}
                />
              )}
            </>
          ) : (
            <>
              {order.status === 'PENDING' && (
                <Button
                  title="Iniciar trabajo"
                  onPress={() => confirmAction('Iniciar trabajo', '¿Confirmás el inicio de esta orden?', 'IN_PROGRESS', 'Trabajo iniciado')}
                  style={styles.actionButton}
                />
              )}
              {order.status === 'IN_PROGRESS' && (
                <Button
                  title="Enviar a revisión"
                  onPress={() => confirmAction('Enviar a revisión', '¿Confirmás enviar esta orden a revisión?', 'IN_REVIEW', 'Enviada a revisión')}
                  style={styles.actionButton}
                />
              )}
              {(order.status === 'PENDING' || order.status === 'IN_PROGRESS') && (
                <Button
                  title="Cancelar"
                  variant="secondary"
                  onPress={() => confirmAction('Cancelar orden', '¿Confirmás la cancelación de esta orden?', 'CANCELLED', 'Orden cancelada')}
                  style={styles.actionButton}
                />
              )}
            </>
          )}
        </View>

        <Text style={styles.sectionTitle}>Historial</Text>
        <Card style={styles.card}>
          <StatusTimeline history={history} />
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

        <BottomSheetModal
          ref={rejectSheetRef}
          snapPoints={['55%']}
          enablePanDownToClose
        >
          <View style={styles.sheetContent}>
            <Text style={styles.sheetTitle}>¿Por qué rechazás esta orden?</Text>
            <TextField
              multiline
              placeholder={`Escribí el motivo (mínimo ${MIN_REJECT_CHARS} caracteres)...`}
              value={rejectComment}
              onChangeText={setRejectComment}
              style={styles.commentInput}
            />
            <Button
              title="Confirmar rechazo"
              variant="danger"
              disabled={rejectComment.trim().length < MIN_REJECT_CHARS}
              onPress={confirmReject}
              style={styles.sheetButton}
            />
            <PressableScale style={styles.sheetCancel} onPress={() => rejectSheetRef.current?.dismiss()}>
              <Text style={styles.sheetCancelText}>Cancelar</Text>
            </PressableScale>
          </View>
        </BottomSheetModal>
      </ScrollView>
    </BottomSheetModalProvider>
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
  sheetContent: {
    padding: Spacing.lg,
    flex: 1,
  },
  sheetTitle: {
    ...Typography.title3,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  commentInput: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  sheetButton: {
    marginTop: Spacing.sm,
  },
  sheetCancel: {
    padding: Spacing.md,
    alignItems: 'center',
  },
  sheetCancelText: {
    ...Typography.subheadline,
    color: Colors.accent,
    fontWeight: '600',
  },
});
