import api from './axiosInstance';
import type { FilamentSpool, SpoolRequest } from '../api/types';

const list = async (archived = false): Promise<FilamentSpool[]> =>
  (await api.get<FilamentSpool[]>('/api/spools', { params: { archived } })).data;
const create = async (body: SpoolRequest) => (await api.post<FilamentSpool>('/api/spools', body)).data;
const update = async (id: number, body: SpoolRequest) => (await api.put<FilamentSpool>(`/api/spools/${id}`, body)).data;
const archive = async (id: number, archived: boolean) =>
  (await api.patch<FilamentSpool>(`/api/spools/${id}/archive`, { archived })).data;
const remove = async (id: number) => {
  await api.delete(`/api/spools/${id}`);
};

export const spoolService = { list, create, update, archive, remove };
