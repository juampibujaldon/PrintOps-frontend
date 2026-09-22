// src/screens/PrinterHistoryScreen.tsx
import React, { useCallback, useEffect, useReducer } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Radius, Spacing } from '../constants/theme';
import { TecnicoStackParamList } from '../navigation/TecnicoStack';
import { HistoryFiltersState, OrderHistoryItemDTO, PrinterMetricsDTO } from '../types/history';
import { historyService } from '../services/historyService';
import MetricsSummary from '../components/MetricsSummary';
import HistoryFilters from '../components/HistoryFilters';
import HistoryTimeline from '../components/HistoryTimeline';

type Props = NativeStackScreenProps<TecnicoStackParamList, 'PrinterHistory'>;

const PAGE_SIZE = 20;

// ─── Estado y reducer ────────────────────────────────────────────────────────
interface HistoryState {
  filters: HistoryFiltersState;
  orders: OrderHistoryItemDTO[];
  metrics: PrinterMetricsDTO | null;
  isLoadingMetrics: boolean;
  isLoadingOrders: boolean;
  isLoadingMore: boolean;
  refreshing: boolean;
  hasMore: boolean;
  error: string | null;
  page: number;
}

const initialState: HistoryState = {
  filters: { type: null, from: null, to: null },
  orders: [],
  metrics: null,
  isLoadingMetrics: true,
  isLoadingOrders: true,
  isLoadingMore: false,
  refreshing: false,
  hasMore: false,
  error: null,
  page: 0,
};

type Action =
  | { type: 'SET_FILTERS'; filters: HistoryFiltersState }
  | { type: 'LOAD_START' }
  | { type: 'REFRESH_START' }
  | { type: 'METRICS_SUCCESS'; metrics: PrinterMetricsDTO }
  | { type: 'ORDERS_SUCCESS'; orders: OrderHistoryItemDTO[]; page: number; hasMore: boolean }
  | { type: 'LOAD_MORE_START' }
  | { type: 'LOAD_MORE_SUCCESS'; orders: OrderHistoryItemDTO[]; page: number; hasMore: boolean }
  | { type: 'LOAD_FAIL'; message: string };

function reducer(state: HistoryState, action: Action): HistoryState {
  switch (action.type) {
    case 'SET_FILTERS':
      return { ...state, filters: action.filters };
    case 'LOAD_START':
      return { ...state, isLoadingMetrics: true, isLoadingOrders: true, error: null };
    case 'REFRESH_START':
      return { ...state, refreshing: true, error: null };
    case 'METRICS_SUCCESS':
      return { ...state, metrics: action.metrics, isLoadingMetrics: false };
    case 'ORDERS_SUCCESS':
      return {
        ...state,
        orders: action.orders,
        page: action.page,
        hasMore: action.hasMore,
        isLoadingOrders: false,
        refreshing: false,
      };
    case 'LOAD_MORE_START':
      return { ...state, isLoadingMore: true };
    case 'LOAD_MORE_SUCCESS':
      return {
        ...state,
        orders: [...state.orders, ...action.orders],
        page: action.page,
        hasMore: action.hasMore,
        isLoadingMore: false,
      };
    case 'LOAD_FAIL':
      return {
        ...state,
        isLoadingMetrics: false,
        isLoadingOrders: false,
        isLoadingMore: false,
        refreshing: false,
        error: action.message,
      };
    default:
      return state;
  }
}

// ─── Screen ──────────────────────────────────────────────────────────────────
export default function PrinterHistoryScreen({ route }: Props) {
  const { printer } = route.params;
  const printerId = Number(printer.id);

  const [state, dispatch] = useReducer(reducer, initialState);
  const { filters, orders, metrics, isLoadingMetrics, isLoadingOrders, isLoadingMore, refreshing, hasMore, error, page } = state;

  const filterDeps = [printerId, filters.type, filters.from, filters.to];

  // Carga inicial (métricas + primera página) en paralelo. Se re-ejecuta al cambiar filtros.
  const loadInitial = useCallback(async () => {
    dispatch({ type: 'LOAD_START' });
    try {
      const [m, history] = await Promise.all([
        historyService.getMetrics(printerId),
        historyService.getHistory(printerId, filters, 0, PAGE_SIZE),
      ]);
      dispatch({ type: 'METRICS_SUCCESS', metrics: m });
      dispatch({
        type: 'ORDERS_SUCCESS',
        orders: history.orders,
        page: history.currentPage,
        hasMore: history.currentPage + 1 < history.totalPages,
      });
    } catch {
      dispatch({ type: 'LOAD_FAIL', message: 'No se pudo cargar el historial.' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, filterDeps);

  useEffect(() => {
    loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, filterDeps);

  // Pull-to-refresh: recarga métricas + página 0 sin skeleton.
  const onRefresh = useCallback(async () => {
    dispatch({ type: 'REFRESH_START' });
    try {
      const [m, history] = await Promise.all([
        historyService.getMetrics(printerId),
        historyService.getHistory(printerId, filters, 0, PAGE_SIZE),
      ]);
      dispatch({ type: 'METRICS_SUCCESS', metrics: m });
      dispatch({
        type: 'ORDERS_SUCCESS',
        orders: history.orders,
        page: history.currentPage,
        hasMore: history.currentPage + 1 < history.totalPages,
      });
    } catch {
      dispatch({ type: 'LOAD_FAIL', message: 'No se pudo recargar el historial.' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, filterDeps);

  // Infinite scroll.
  const onEndReached = useCallback(async () => {
    if (isLoadingMore || !hasMore || isLoadingOrders) return;
    dispatch({ type: 'LOAD_MORE_START' });
    try {
      const next = page + 1;
      const history = await historyService.getHistory(printerId, filters, next, PAGE_SIZE);
      dispatch({
        type: 'LOAD_MORE_SUCCESS',
        orders: history.orders,
        page: history.currentPage,
        hasMore: history.currentPage + 1 < history.totalPages,
      });
    } catch {
      dispatch({ type: 'LOAD_FAIL', message: 'No se pudieron cargar más órdenes.' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingMore, hasMore, isLoadingOrders, page, printerId, filters.type, filters.from, filters.to]);

  const onChangeFilters = (next: HistoryFiltersState) => dispatch({ type: 'SET_FILTERS', filters: next });
  const clearFilters = () => onChangeFilters({ type: null, from: null, to: null });

  const onPressDetail = (order: OrderHistoryItemDTO) => {
    Alert.alert(
      order.orderNumber,
      order.description
        ? order.description
        : `Tipo: ${order.type}\nEstado: ${order.status}\n${order.technicianName ? 'Técnico: ' + order.technicianName : ''}`,
    );
  };

  const hasFilters = !!(filters.type || filters.from || filters.to);

  // ── Estados ────────────────────────────────────────────────────────────────
  if (isLoadingOrders) {
    return (
      <View style={styles.container}>
        <MetricsSummary metrics={null} loading />
        <SkeletonItems />
      </View>
    );
  }

  if (error && orders.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={loadInitial}>
          <Text style={styles.primaryBtnText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const emptyComponent = hasFilters ? (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>No hay mantenimientos que coincidan</Text>
      <Text style={styles.emptySub}>Probá con otros filtros.</Text>
      <TouchableOpacity style={styles.primaryBtn} onPress={clearFilters}>
        <Text style={styles.primaryBtnText}>Limpiar filtros</Text>
      </TouchableOpacity>
    </View>
  ) : (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>Esta impresora no tiene mantenimientos</Text>
      <Text style={styles.emptySub}>El historial aparecerá acá una vez que se registre la primera orden.</Text>
      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={() => Alert.alert('Crear orden', 'La creación de órdenes está disponible desde el panel técnico.')}
      >
        <Text style={styles.primaryBtnText}>Crear primera orden</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <HistoryTimeline
        orders={orders}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onEndReached={onEndReached}
        isLoadingMore={isLoadingMore}
        onPressDetail={onPressDetail}
        header={
          <>
            <MetricsSummary metrics={metrics} loading={isLoadingMetrics} />
            <HistoryFilters filters={filters} onChange={onChangeFilters} />
          </>
        }
        empty={emptyComponent}
      />
    </View>
  );
}

// ─── Skeleton de ítems del timeline ──────────────────────────────────────────
function SkeletonItems() {
  return (
    <View style={styles.skeletonList}>
      {[0, 1, 2, 3].map(i => (
        <View key={i} style={styles.skeletonItem}>
          <View style={styles.skeletonDot} />
          <View style={styles.skeletonCard}>
            <View style={[styles.skeletonBar, { width: '35%' }]} />
            <View style={[styles.skeletonBar, { width: '90%' }]} />
            <View style={[styles.skeletonBar, { width: '60%' }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  errorText: { color: Colors.textSecondary, fontSize: 15, marginBottom: Spacing.md, textAlign: 'center' },
  primaryBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    marginTop: Spacing.sm,
  },
  primaryBtnText: { color: Colors.background, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 40, paddingHorizontal: Spacing.xl },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.sm, textAlign: 'center' },
  emptySub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: Spacing.sm },
  skeletonList: { paddingHorizontal: Spacing.lg },
  skeletonItem: { flexDirection: 'row', marginBottom: Spacing.md },
  skeletonDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.surfaceBorder, marginRight: Spacing.sm, marginTop: 4 },
  skeletonCard: {
    flex: 1,
    backgroundColor: Colors.surfaceBase,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
  },
  skeletonBar: { height: 12, backgroundColor: Colors.surfaceElevated, borderRadius: Radius.sm, marginBottom: Spacing.sm },
});
