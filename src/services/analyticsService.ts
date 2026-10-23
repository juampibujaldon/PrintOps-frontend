import api from './axiosInstance';
import type { ActivityItem, FailurePrediction, PageResponse, Profitability } from '../api/types';

const predictions = async (): Promise<FailurePrediction[]> =>
  (await api.get<FailurePrediction[]>('/api/metrics/predictions')).data;
const schedulePreventive = async (printerId: number): Promise<{ orderId: number }> =>
  (await api.post<{ orderId: number }>(`/api/metrics/predictions/${printerId}/preventive`)).data;
const profitability = async (from: string, to: string): Promise<Profitability> =>
  (await api.get<Profitability>('/api/metrics/profitability', { params: { from, to } })).data;
const activity = async (page: number, kind?: string, size = 30): Promise<PageResponse<ActivityItem>> =>
  (await api.get<PageResponse<ActivityItem>>('/api/activity', { params: { page, size, kind: kind || undefined } })).data;

export type ExportDataset = 'orders' | 'quotes' | 'parts' | 'movements' | 'jobs';

// CSV como Blob (la pantalla lo descarga con utils/download).
const exportCsv = async (dataset: ExportDataset, from?: string, to?: string): Promise<Blob> =>
  (await api.get<Blob>(`/api/exports/${dataset}.csv`, { params: { from, to }, responseType: 'blob', timeout: 60000 })).data;

export const analyticsService = { predictions, schedulePreventive, profitability, activity, exportCsv };
