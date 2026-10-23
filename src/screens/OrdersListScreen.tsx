// src/screens/OrdersListScreen.tsx
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ClipboardList, RefreshCw } from 'lucide-react';
import { ORDER_STATUS, ORDER_TYPE } from '../constants/orders';
import { useToast } from '../context/ToastContext';
import { orderService } from '../services/orderService';
import type { OrderResponse } from '../services/orderService';
import { formatTimestamp } from '../utils/formatDate';
import { Badge, Button, EmptyState, ScreenHeader, Skeleton } from '../components/ui';
import { usePagedList } from '../hooks/usePagedList';
import styles from './OrdersListScreen.module.css';

export default function OrdersListScreen() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const fetchPage = useCallback((page: number) => orderService.pageOrders(page), []);
  const { items: orders, loading, loadingMore, hasMore, total, error, reload, loadMore } =
    usePagedList<OrderResponse>(fetchPage);

  useEffect(() => {
    if (!error) return;
    const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
    showToast(message || 'No se pudieron cargar las órdenes', { type: 'error', title: 'Error' });
  }, [error, showToast]);

  const onRefresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  return (
    <>
      <ScreenHeader
        title="Órdenes"
        subtitle={total ? `${total} en total` : undefined}
        backTo="/printers"
        rightContent={
          <Button
            title="Actualizar"
            variant="secondary"
            size="sm"
            fullWidth={false}
            icon={<RefreshCw size={16} />}
            loading={refreshing}
            onPress={() => void onRefresh()}
          />
        }
      />

      {loading ? (
        <div className={styles.skeletons} aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={84} className={styles.skeleton} />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<ClipboardList size={44} strokeWidth={1.5} />}
          title="Sin órdenes"
          description="Las órdenes de mantenimiento aparecerán acá."
        />
      ) : (
        <ul className={styles.list}>
          {orders.map((item) => {
            const status = ORDER_STATUS[item.status];
            return (
              <li key={item.id} className={styles.item}>
                <button type="button" className={styles.row} onClick={() => navigate(`/orders/${item.id}`)}>
                  <span className={styles.rowText}>
                    <span className={styles.titleRow}>
                      <span className={styles.title}>Orden #{item.id}</span>
                      <span className={styles.date}>{formatTimestamp(item.createdAt)}</span>
                    </span>
                    <span className={styles.meta}>
                      {ORDER_TYPE[item.type]?.label ?? item.type}
                      {' · '}
                      {item.assignedToName ?? 'Sin asignar'}
                    </span>
                    <span className={styles.badgeRow}>
                      <Badge label={status.label} color={status.color} pulse={item.status === 'IN_PROGRESS'} />
                    </span>
                  </span>
                  <ChevronRight size={18} className={styles.chevron} aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {!loading && hasMore && (
        <div className={styles.more}>
          <Button title="Cargar más" variant="secondary" fullWidth={false} loading={loadingMore} onPress={() => void loadMore()} />
        </div>
      )}
    </>
  );
}
