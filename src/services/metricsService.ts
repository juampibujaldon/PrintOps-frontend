// src/services/metricsService.ts
import api from './axiosInstance';
import { DashboardMetricsDTO } from '../types/dashboard';

// Métricas globales del dashboard (US-08).
const getDashboardMetrics = async (from?: string, to?: string): Promise<DashboardMetricsDTO> => {
  const { data } = await api.get<DashboardMetricsDTO>('/api/metrics/dashboard', {
    params: { from: from ?? undefined, to: to ?? undefined },
  });
  return data;
};

export const metricsService = {
  getDashboardMetrics,
};
