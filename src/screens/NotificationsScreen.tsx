// src/screens/NotificationsScreen.tsx
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellOff, RefreshCw } from 'lucide-react';
import { Colors } from '../constants/theme';
import { Button, EmptyState, IconButton, ScreenHeader, Skeleton, Spinner } from '../components/ui';
import { usePagedList } from '../hooks/usePagedList';
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
  const [refreshing, setRefreshing] = useState(false);
  const fetchPage = useCallback((page: number) => notificationService.page(page, 30), []);
  const { items: notifications, setItems: setNotifications, loading, loadingMore, hasMore, error, reload, loadMore } =
    usePagedList<AppNotification>(fetchPage);

  useEffect(() => {
    if (!error) return;
    const err = error as { response?: { data?: { message?: string } } };
    showToast(err.response?.data?.message || 'No se pudieron cargar las notificaciones', { type: 'error', title: 'Error' });
  }, [error, showToast]);

  // Novedades en vivo: cada notificación entrante por WebSocket recarga la lista sin ruido
  // (los mensajes de telemetría o de la cola de trabajos no).
  useEffect(
    () =>
      webSocketService.subscribe((msg) => {
        if (!msg.type || msg.type === 'notification') void reload(true);
      }),
    [reload],
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await reload();
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
        {hasMore && (
          <div className={styles.more}>
            <Button title="Cargar más" variant="secondary" fullWidth={false} loading={loadingMore} onPress={() => void loadMore()} />
          </div>
        )}
      </div>
    </>
  );
}
