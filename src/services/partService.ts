// src/services/partService.ts
import { API_BASE_URL } from '../constants/api';
import api from './axiosInstance';

export interface Part {
  id: number;
  name: string;
  partNumber: string;
  stockQuantity: number;
}

export interface PartInput {
  name: string;
  partNumber: string;
  stockQuantity: number;
}

const listParts = async (query?: string): Promise<Part[]> => {
  const response = await api.get<Part[]>(`${API_BASE_URL}/api/parts`, {
    params: query ? { query } : undefined,
  });
  return response.data;
};

const createPart = async (data: PartInput): Promise<Part> => {
  const response = await api.post<Part>(`${API_BASE_URL}/api/parts`, data);
  return response.data;
};

const updatePart = async (id: number, data: PartInput): Promise<Part> => {
  const response = await api.put<Part>(`${API_BASE_URL}/api/parts/${id}`, data);
  return response.data;
};

const deletePart = async (id: number): Promise<void> => {
  await api.delete(`${API_BASE_URL}/api/parts/${id}`);
};

export const partService = { listParts, createPart, updatePart, deletePart };
