// src/services/workspaceService.ts
import { API_BASE_URL } from '../constants/api';
import api from './axiosInstance';

export interface Workspace {
  id: number;
  name: string;
}

const getMine = async (): Promise<Workspace> => {
  const response = await api.get<Workspace>(`${API_BASE_URL}/api/workspaces/me`);
  return response.data;
};

// Invita a un técnico por email. Devuelve el mensaje y (en dev) el token.
const invite = async (email: string): Promise<{ message: string; inviteToken?: string }> => {
  const response = await api.post<{ message: string; inviteToken?: string }>(
    `${API_BASE_URL}/api/workspaces/invites`,
    { email },
  );
  return response.data;
};

export const workspaceService = { getMine, invite };
