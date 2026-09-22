// src/services/partService.ts
import { API_BASE_URL } from '../constants/api';
import api from './axiosInstance';
import { CreateSparePartInput, MovementType, SparePartDTO, StockMovementDTO } from '../types/parts';

export interface ListPartsParams {
  search?: string;
  category?: string;
  lowStock?: boolean;
}

const listParts = async (params?: ListPartsParams): Promise<SparePartDTO[]> => {
  const { data } = await api.get<SparePartDTO[]>(`${API_BASE_URL}/api/parts`, { params });
  return data;
};

const getPart = async (id: number): Promise<SparePartDTO> => {
  const { data } = await api.get<SparePartDTO>(`${API_BASE_URL}/api/parts/${id}`);
  return data;
};

const createPart = async (input: CreateSparePartInput): Promise<SparePartDTO> => {
  const { data } = await api.post<SparePartDTO>(`${API_BASE_URL}/api/parts`, input);
  return data;
};

const updatePart = async (id: number, input: CreateSparePartInput): Promise<SparePartDTO> => {
  const { data } = await api.put<SparePartDTO>(`${API_BASE_URL}/api/parts/${id}`, input);
  return data;
};

const deletePart = async (id: number): Promise<void> => {
  await api.delete(`${API_BASE_URL}/api/parts/${id}`);
};

const updateStock = async (
  id: number,
  type: MovementType,
  quantity: number,
  note?: string,
): Promise<SparePartDTO> => {
  const { data } = await api.patch<SparePartDTO>(`${API_BASE_URL}/api/parts/${id}/stock`, {
    type,
    quantity,
    note: note ?? undefined,
  });
  return data;
};

const getMovements = async (id: number): Promise<StockMovementDTO[]> => {
  const { data } = await api.get<StockMovementDTO[]>(`${API_BASE_URL}/api/parts/${id}/movements`);
  return data;
};

const getCategories = async (): Promise<string[]> => {
  const { data } = await api.get<string[]>(`${API_BASE_URL}/api/parts/categories`);
  return data;
};

export const partService = {
  listParts,
  getPart,
  createPart,
  updatePart,
  deletePart,
  updateStock,
  getMovements,
  getCategories,
};
