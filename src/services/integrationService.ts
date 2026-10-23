import api from './axiosInstance';
import type { Integration, IntegrationType, PrinterTelemetry } from '../api/types';

// 204 = la impresora no tiene integración.
const get = async (printerId: number): Promise<Integration | null> => {
  const res = await api.get<Integration>(`/api/printers/${printerId}/integration`);
  return res.status === 204 ? null : res.data;
};
const createOrRotate = async (printerId: number, type: IntegrationType) =>
  (await api.post<Integration>(`/api/printers/${printerId}/integration`, { type })).data;
const remove = async (printerId: number) => {
  await api.delete(`/api/printers/${printerId}/integration`);
};
const telemetry = async (): Promise<PrinterTelemetry[]> => (await api.get<PrinterTelemetry[]>('/api/printers/telemetry')).data;

export const integrationService = { get, createOrRotate, remove, telemetry };
