// src/services/historyService.ts
import api from './axiosInstance';
import {
  HistoryFiltersState,
  PartUsageSummaryDTO,
  PrinterHistoryDTO,
  PrinterMetricsDTO,
} from '../types/history';

// Historial de mantenimiento por impresora (US-07).
const getHistory = async (
  printerId: number,
  filters: HistoryFiltersState,
  page: number,
  size: number,
): Promise<PrinterHistoryDTO> => {
  const { data } = await api.get<PrinterHistoryDTO>(`/api/printers/${printerId}/history`, {
    params: {
      type: filters.type ?? undefined,
      from: filters.from ?? undefined,
      to: filters.to ?? undefined,
      page,
      size,
    },
  });
  return data;
};

const getMetrics = async (printerId: number): Promise<PrinterMetricsDTO> => {
  const { data } = await api.get<PrinterMetricsDTO>(`/api/printers/${printerId}/history/metrics`);
  return data;
};

const getParts = async (printerId: number): Promise<PartUsageSummaryDTO[]> => {
  const { data } = await api.get<PartUsageSummaryDTO[]>(`/api/printers/${printerId}/history/parts`);
  return data;
};

export const historyService = {
  getHistory,
  getMetrics,
  getParts,
};
