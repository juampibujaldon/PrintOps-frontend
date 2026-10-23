import api from './axiosInstance';
import type { PrintJob, PrintJobRequest } from '../api/types';

const list = async (active = true, printerId?: number): Promise<PrintJob[]> =>
  (await api.get<PrintJob[]>('/api/jobs', { params: { active, printerId } })).data;

const create = async (body: PrintJobRequest): Promise<PrintJob> => (await api.post<PrintJob>('/api/jobs', body)).data;
const update = async (id: number, body: PrintJobRequest): Promise<PrintJob> =>
  (await api.put<PrintJob>(`/api/jobs/${id}`, body)).data;
const start = async (id: number): Promise<PrintJob> => (await api.post<PrintJob>(`/api/jobs/${id}/start`)).data;
const finish = async (id: number, actual?: { actualHours?: number; actualGrams?: number; notes?: string }) =>
  (await api.post<PrintJob>(`/api/jobs/${id}/finish`, actual ?? {})).data;
const fail = async (id: number, notes?: string) => (await api.post<PrintJob>(`/api/jobs/${id}/fail`, { notes })).data;
const cancel = async (id: number) => (await api.post<PrintJob>(`/api/jobs/${id}/cancel`)).data;
const requeue = async (id: number) => (await api.post<PrintJob>(`/api/jobs/${id}/requeue`)).data;

export const jobService = { list, create, update, start, finish, fail, cancel, requeue };
