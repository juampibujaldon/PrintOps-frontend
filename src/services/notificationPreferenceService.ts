// src/services/notificationPreferenceService.ts
import { API_BASE_URL } from '../constants/api';
import api from './axiosInstance';

export interface NotificationPreference {
  maintenanceDue: boolean;
  lowStock: boolean;
  assignedOrders: boolean;
  ordersInReview: boolean;
  dailySummary: boolean;
  dailySummaryTime: string;
}

const getMine = async (): Promise<NotificationPreference> => {
  const response = await api.get<NotificationPreference>(`${API_BASE_URL}/api/users/me/notification-preferences`);
  return response.data;
};

const updateMine = async (data: NotificationPreference): Promise<NotificationPreference> => {
  const response = await api.put<NotificationPreference>(`${API_BASE_URL}/api/users/me/notification-preferences`, data);
  return response.data;
};

export const notificationPreferenceService = { getMine, updateMine };
