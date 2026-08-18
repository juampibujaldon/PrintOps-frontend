// src/screens/NotificationsScreen.tsx
import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../constants/theme';
import { notificationService, AppNotification } from '../services/notificationService';

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handlePress = async (n: AppNotification) => {
    if (!n.read) {
      try {
        await notificationService.markRead(n.id);
        setNotifications(prev => prev.map(x => (x.id === n.id ? { ...x, read: true } : x)));
      } catch {
        // no crítico
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      data={notifications}
      keyExtractor={item => String(item.id)}
      contentContainerStyle={styles.container}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.emptyText}>Sin notificaciones</Text>
        </View>
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={[styles.card, item.read && styles.cardRead]}
          activeOpacity={0.8}
          onPress={() => handlePress(item)}
        >
          <Text style={styles.message}>{item.message}</Text>
          <Text style={styles.date}>{new Date(item.createdAt).toLocaleString()}</Text>
          {!item.read && <View style={styles.unreadDot} />}
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: Colors.background, flexGrow: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  card: { backgroundColor: Colors.inputBackground, padding: 16, borderRadius: 12, marginBottom: 12, position: 'relative' },
  cardRead: { opacity: 0.6 },
  message: { fontSize: 15, color: Colors.textPrimary },
  date: { fontSize: 12, color: Colors.textSecondary, marginTop: 6 },
  unreadDot: { position: 'absolute', top: 12, right: 12, width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.accent },
  emptyText: { color: Colors.textSecondary, fontSize: 14 },
});
