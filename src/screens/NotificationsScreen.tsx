// src/screens/NotificationsScreen.tsx
import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Alert, RefreshControl, Pressable,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { BellOff } from 'lucide-react-native';
import { Colors, Radius, Spacing, Typography } from '../constants/theme';
import { notificationService, AppNotification } from '../services/notificationService';
import { formatTimestamp } from '../utils/formatDate';
import EmptyState from '../components/ui/EmptyState';
import Skeleton from '../components/ui/Skeleton';

export default function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await notificationService.listMine();
      setNotifications(data);
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'No se pudieron cargar las notificaciones');
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

  const handlePress = async (n: AppNotification) => {
    if (!n.read) {
      setNotifications(prev => prev.map(x => (x.id === n.id ? { ...x, read: true } : x)));
      notificationService.markRead(n.id).catch(() => {
        // No crítico: se vuelve a marcar en la próxima carga.
      });
    }
    if (n.orderId) {
      // La pantalla de detalle vive en el stack de Inicio.
      navigation.navigate('InicioStack', { screen: 'OrderDetail', params: { orderId: n.orderId } });
    }
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
      data={notifications}
      keyExtractor={item => String(item.id)}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.textTertiary} />}
      ListEmptyComponent={
        <EmptyState
          icon={<BellOff color={Colors.textTertiary} size={44} strokeWidth={1.5} />}
          title="Sin notificaciones"
          description="Te avisaremos cuando haya novedades en tus órdenes."
        />
      }
      renderItem={({ item, index }) => {
        const first = index === 0;
        const last = index === notifications.length - 1;
        return (
          <Pressable
            onPress={() => handlePress(item)}
            style={({ pressed }) => [
              styles.row,
              first && styles.rowFirst,
              last && styles.rowLast,
              pressed && styles.rowPressed,
            ]}
          >
            <View style={styles.dotSlot}>
              {!item.read ? <Animated.View entering={FadeIn} style={styles.unreadDot} /> : null}
            </View>
            <View style={[styles.rowInner, !last && styles.separator]}>
              <Text style={[styles.message, item.read && styles.messageRead]}>{item.message}</Text>
              <Text style={styles.date}>{formatTimestamp(item.createdAt)}</Text>
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
  skeleton: { height: 64, borderRadius: Radius.lg, marginBottom: Spacing.sm },
  row: { flexDirection: 'row', backgroundColor: Colors.surface },
  rowFirst: { borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg },
  rowLast: { borderBottomLeftRadius: Radius.lg, borderBottomRightRadius: Radius.lg },
  rowPressed: { backgroundColor: Colors.fill },
  dotSlot: { width: 28, alignItems: 'center', paddingTop: Spacing.md + 6 },
  unreadDot: { width: 9, height: 9, borderRadius: 4.5, backgroundColor: Colors.primary },
  rowInner: { flex: 1, paddingVertical: Spacing.md, paddingRight: Spacing.lg },
  separator: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.separator },
  message: { ...Typography.subheadline, color: Colors.textPrimary, fontWeight: '500', lineHeight: 20 },
  messageRead: { fontWeight: '400', color: Colors.textSecondary },
  date: { ...Typography.footnote, color: Colors.textTertiary, marginTop: 4 },
});
