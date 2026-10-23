// src/services/notificationService.ts
import { API_BASE_URL } from '../constants/api';
import api from './axiosInstance';
import type { PageResponse } from '../api/types';

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

const page = async (page: number, size = 30): Promise<PageResponse<AppNotification>> =>
  (await api.get<PageResponse<AppNotification>>(`${API_BASE_URL}/api/notifications`, { params: { page, size } })).data;

const unreadCount = async (): Promise<number> =>
  (await api.get<{ count: number }>(`${API_BASE_URL}/api/notifications/unread-count`)).data.count;

export const notificationService = { listMine, page, unreadCount, markRead };
