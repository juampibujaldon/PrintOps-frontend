// src/services/printerHistoryService.ts
import { API_BASE_URL } from '../constants/api';
import api from './axiosInstance';
import {
  PrinterHistory,
  PrinterMetrics,
  PartUsageSummary,
  HistoryFilters,
} from '../types/printerHistory';

const getHistory = async (printerId: number, filters: HistoryFilters): Promise<PrinterHistory> => {
  const params: Record<string, string | number> = {
    page: filters.page,
    size: filters.size,
  };
  if (filters.type) params.type = filters.type;
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;

  const response = await api.get<PrinterHistory>(
    `${API_BASE_URL}/api/printers/${printerId}/history`,
    { params },
  );
  return response.data;
};

const getMetrics = async (printerId: number): Promise<PrinterMetrics> => {
  const response = await api.get<PrinterMetrics>(
    `${API_BASE_URL}/api/printers/${printerId}/history/metrics`,
  );
  return response.data;
};

const getParts = async (printerId: number): Promise<PartUsageSummary[]> => {
  const response = await api.get<PartUsageSummary[]>(
    `${API_BASE_URL}/api/printers/${printerId}/history/parts`,
  );
  return response.data;
};

export const printerHistoryService = { getHistory, getMetrics, getParts };
