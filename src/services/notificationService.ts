// src/services/notificationService.ts
import { API_BASE_URL } from '../constants/api';
import api from './axiosInstance';

export interface AppNotification {
  id: number;
  message: string;
  orderId: number | null;
  recipientUserId: number | null;
  type: string | null;
  read: boolean;
  createdAt: string;
}

const listMine = async (): Promise<AppNotification[]> => {
  const response = await api.get<AppNotification[]>(`${API_BASE_URL}/api/notifications`);
  return response.data;
};

const markRead = async (id: number): Promise<AppNotification> => {
  const response = await api.patch<AppNotification>(`${API_BASE_URL}/api/notifications/${id}/read`);
  return response.data;
};

export const notificationService = { listMine, markRead };
