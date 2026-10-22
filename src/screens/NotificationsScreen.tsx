// src/screens/NotificationsScreen.tsx
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellOff, RefreshCw } from 'lucide-react';
import { Colors } from '../constants/theme';
import { EmptyState, IconButton, ScreenHeader, Skeleton, Spinner } from '../components/ui';
import { useToast } from '../context/ToastContext';
import { notificationService } from '../services/notificationService';
import type { AppNotification } from '../services/notificationService';
import { webSocketService } from '../services/webSocketService';
import { formatTimestamp } from '../utils/formatDate';
import { cx } from '../utils/cx';
import styles from './NotificationsScreen.module.css';

export default function NotificationsScreen() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (quiet = false) => {
      try {
        setNotifications(await notificationService.listMine());
      } catch (e) {
        if (!quiet) {
          const err = e as { response?: { data?: { message?: string } } };
          showToast(err.response?.data?.message || 'No se pudieron cargar las notificaciones', { type: 'error', title: 'Error' });
        }
      } finally {
        setLoading(false);
      }
    },
    [showToast],
  );

  useEffect(() => {
    void load();
  }, [load]);

  // Novedades en vivo: cada notificación entrante por WebSocket recarga la lista sin ruido.
  useEffect(() => webSocketService.subscribe(() => void load(true)), [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handlePress = (n: AppNotification) => {
    if (!n.read) {
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      notificationService.markRead(n.id).catch(() => {
        // No crítico: se vuelve a marcar en la próxima carga.
      });
    }
    if (n.orderId) navigate(`/orders/${n.orderId}`);
  };

  const refreshButton = (
    <IconButton
      icon={refreshing ? <Spinner size={20} /> : <RefreshCw size={20} strokeWidth={1.75} />}
      label="Actualizar"
      onPress={onRefresh}
      disabled={refreshing || loading}
    />
  );

  if (loading) {
    return (
      <>
        <ScreenHeader title="Notificaciones" />
        <div className={styles.container}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className={styles.skeleton} />
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <ScreenHeader title="Notificaciones" rightContent={refreshButton} />
      <div className={styles.container}>
        {notifications.length === 0 ? (
          <EmptyState
            icon={<BellOff color={Colors.textTertiary} size={44} strokeWidth={1.5} />}
            title="Sin notificaciones"
            description="Te avisaremos cuando haya novedades en tus órdenes."
          />
        ) : (
          <ul className={styles.list}>
            {notifications.map((item, index) => {
              const last = index === notifications.length - 1;
              return (
                <li key={item.id}>
                  <button type="button" className={styles.row} onClick={() => handlePress(item)}>
                    <span className={styles.dotSlot}>
                      {!item.read ? <span className={styles.unreadDot} role="img" aria-label="Sin leer" /> : null}
                    </span>
                    <span className={cx(styles.rowInner, !last && styles.separator)}>
                      <span className={cx(styles.message, item.read && styles.messageRead)}>{item.message}</span>
                      <span className={styles.date}>{formatTimestamp(item.createdAt)}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
