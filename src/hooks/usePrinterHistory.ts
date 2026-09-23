// src/hooks/usePrinterHistory.ts
import { useCallback, useEffect, useReducer, useState } from 'react';
import { printerHistoryService } from '../services/printerHistoryService';
import { OrderType } from '../services/orderService';
import { OrderHistoryItem, PrinterMetrics } from '../types/printerHistory';

const PAGE_SIZE = 20;

interface Filters {
  type: OrderType | null;
  from: string | null;
  to: string | null;
  page: number;
  size: number;
}

interface State {
  filters: Filters;
  orders: OrderHistoryItem[];
  metrics: PrinterMetrics | null;
  isLoadingMetrics: boolean;
  isLoadingOrders: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
}

type Action =
  | { type: 'SET_FILTERS'; payload: Partial<Filters> }
  | { type: 'METRICS_START' }
  | { type: 'METRICS_SUCCESS'; payload: PrinterMetrics }
  | { type: 'METRICS_ERROR' }
  | { type: 'ORDERS_START' }
  | { type: 'ORDERS_SUCCESS'; payload: { orders: OrderHistoryItem[]; totalPages: number; page: number } }
  | { type: 'ORDERS_ERROR'; payload: string }
  | { type: 'LOAD_MORE_START' }
  | { type: 'LOAD_MORE_SUCCESS'; payload: { orders: OrderHistoryItem[]; totalPages: number; page: number } }
  | { type: 'LOAD_MORE_ERROR' };

const initialState: State = {
  filters: { type: null, from: null, to: null, page: 0, size: PAGE_SIZE },
  orders: [],
  metrics: null,
  isLoadingMetrics: true,
  isLoadingOrders: true,
  isLoadingMore: false,
  hasMore: false,
  error: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_FILTERS':
      // Al cambiar filtros se resetea a la página 0 (el effect recargará).
      return {
        ...state,
        filters: { ...state.filters, ...action.payload, page: 0 },
      };
    case 'METRICS_START':
      return { ...state, isLoadingMetrics: true };
    case 'METRICS_SUCCESS':
      return { ...state, isLoadingMetrics: false, metrics: action.payload };
    case 'METRICS_ERROR':
      return { ...state, isLoadingMetrics: false };
    case 'ORDERS_START':
      return { ...state, isLoadingOrders: true, error: null, orders: [] };
    case 'ORDERS_SUCCESS':
      return {
        ...state,
        isLoadingOrders: false,
        orders: action.payload.orders,
        hasMore: action.payload.page < action.payload.totalPages - 1,
        filters: { ...state.filters, page: action.payload.page },
      };
    case 'ORDERS_ERROR':
      return { ...state, isLoadingOrders: false, error: action.payload };
    case 'LOAD_MORE_START':
      return { ...state, isLoadingMore: true };
    case 'LOAD_MORE_SUCCESS':
      return {
        ...state,
        isLoadingMore: false,
        orders: [...state.orders, ...action.payload.orders],
        hasMore: action.payload.page < action.payload.totalPages - 1,
        filters: { ...state.filters, page: action.payload.page },
      };
    case 'LOAD_MORE_ERROR':
      return { ...state, isLoadingMore: false };
    default:
      return state;
  }
}

export function usePrinterHistory(printerId: number) {
  const [state, dispatch] = useReducer(reducer, initialState);
  // Clave que se incrementa para forzar la recarga (botón "Reintentar").
  const [reloadKey, setReloadKey] = useState(0);
  const { filters } = state;

  // Métricas: cargan una sola vez al montar (no dependen de los filtros).
  useEffect(() => {
    let active = true;
    dispatch({ type: 'METRICS_START' });
    printerHistoryService
      .getMetrics(printerId)
      .then(m => active && dispatch({ type: 'METRICS_SUCCESS', payload: m }))
      .catch(() => active && dispatch({ type: 'METRICS_ERROR' }));
    return () => {
      active = false;
    };
  }, [printerId, reloadKey]);

  // Primera página: al montar y cada vez que cambian type/from/to.
  useEffect(() => {
    let active = true;
    dispatch({ type: 'ORDERS_START' });
    printerHistoryService
      .getHistory(printerId, { ...filters, page: 0 })
      .then(res => active && dispatch({
        type: 'ORDERS_SUCCESS',
        payload: { orders: res.orders, totalPages: res.totalPages, page: res.currentPage },
      }))
      .catch((error: any) =>
        active && dispatch({
          type: 'ORDERS_ERROR',
          payload: error?.response?.data?.message || 'No se pudo cargar el historial',
        }),
      );
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [printerId, filters.type, filters.from, filters.to, reloadKey]);

  const loadMore = useCallback(() => {
    if (state.isLoadingMore || state.isLoadingOrders || !state.hasMore) return;
    const nextPage = filters.page + 1;
    dispatch({ type: 'LOAD_MORE_START' });
    printerHistoryService
      .getHistory(printerId, { ...filters, page: nextPage })
      .then(res => dispatch({
        type: 'LOAD_MORE_SUCCESS',
        payload: { orders: res.orders, totalPages: res.totalPages, page: res.currentPage },
      }))
      .catch(() => dispatch({ type: 'LOAD_MORE_ERROR' }));
  }, [printerId, filters, state.isLoadingMore, state.isLoadingOrders, state.hasMore]);

  const setType = useCallback((type: OrderType | null) => {
    dispatch({ type: 'SET_FILTERS', payload: { type } });
  }, []);

  const setDateRange = useCallback((from: string | null, to: string | null) => {
    dispatch({ type: 'SET_FILTERS', payload: { from, to } });
  }, []);

  const clearFilters = useCallback(() => {
    dispatch({ type: 'SET_FILTERS', payload: { type: null, from: null, to: null } });
  }, []);

  const retry = useCallback(() => {
    setReloadKey(k => k + 1);
  }, []);

  const hasActiveFilters = filters.type !== null || filters.from !== null || filters.to !== null;

  return { ...state, loadMore, setType, setDateRange, clearFilters, retry, hasActiveFilters };
}
