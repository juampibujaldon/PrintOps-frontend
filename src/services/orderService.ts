// src/services/orderService.ts
import { API_BASE_URL } from '../constants/api';
import api from './axiosInstance';
import { PhotoAsset } from './printerService';

export type OrderType = 'PREVENTIVE' | 'CORRECTIVE' | 'CALIBRATION';
export type OrderStatus = 'PENDING' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED' | 'CANCELLED';

export interface ChecklistItemInput {
  text: string;
  done: boolean;
  na: boolean;
}

export interface PartInput {
  partId?: number | null;
  partNumber?: string | null;
  quantity: number;
  external: boolean;
}

export interface OrderChecklistItem {
  id: number;
  text: string;
  done: boolean;
  na: boolean;
}

export interface OrderPart {
  id: number;
  partId: number | null;
  partNumber: string | null;
  partName: string | null;
  quantity: number;
  external: boolean;
}

export interface OrderPhoto {
  id: number;
  url: string;
  label: string | null;
}

export interface StatusHistory {
  id: number;
  orderId: number;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  comment: string | null;
  changedById: number | null;
  changedByName: string | null;
  changedAt: string;
}

export interface OrderResponse {
  id: number;
  printerId: number;
  assignedToId: number | null;
  assignedToName: string | null;
  type: OrderType;
  status: OrderStatus;
  description: string | null;
  estimatedTimeMinutes: number | null;
  actualTimeMinutes: number | null;
  createdAt: string;
  checklistItems: OrderChecklistItem[];
  parts: OrderPart[];
  photos: OrderPhoto[];
}

export interface CreateOrderData {
  printerId: number;
  type: OrderType;
  description?: string | null;
  estimatedTimeMinutes?: number | null;
  checklistItems: ChecklistItemInput[];
  parts: PartInput[];
}

// Crear orden y, si hay fotos, adjuntarlas al final (endpoint separado).
const createOrder = async (data: CreateOrderData, photos?: PhotoAsset[]): Promise<OrderResponse> => {
  const { data: order } = await api.post<OrderResponse>(`${API_BASE_URL}/api/orders`, data);

  if (photos && photos.length > 0) {
    await addPhotos(order.id, photos);
  }

  return getOrder(order.id);
};

const listOrders = async (printerId?: number, status?: OrderStatus): Promise<OrderResponse[]> => {
  const response = await api.get<OrderResponse[]>(`${API_BASE_URL}/api/orders`, {
    params: { printerId, status },
  });
  return response.data;
};

const getOrder = async (id: number): Promise<OrderResponse> => {
  const response = await api.get<OrderResponse>(`${API_BASE_URL}/api/orders/${id}`);
  return response.data;
};

// Cambio de estado (US-05). `comment` es obligatorio solo en rechazos.
const updateStatus = async (
  id: number,
  newStatus: OrderStatus,
  comment?: string,
): Promise<OrderResponse> => {
  const response = await api.patch<OrderResponse>(`${API_BASE_URL}/api/orders/${id}/status`, {
    newStatus,
    comment: comment || undefined,
  });
  return response.data;
};

const getHistory = async (id: number): Promise<StatusHistory[]> => {
  const response = await api.get<StatusHistory[]>(`${API_BASE_URL}/api/orders/${id}/history`);
  return response.data;
};

const addPart = async (id: number, part: PartInput): Promise<OrderResponse> => {
  const response = await api.post<OrderResponse>(`${API_BASE_URL}/api/orders/${id}/parts`, part);
  return response.data;
};

const addPhotos = async (orderId: number, photos: PhotoAsset[]): Promise<OrderResponse> => {
  const formData = new FormData();
  photos.forEach((p, i) => {
    formData.append('photos', {
      uri: p.uri,
      type: p.type || 'image/jpeg',
      name: p.name || `photo_${i}.jpg`,
    } as any);
  });
  // Sin Content-Type manual: axios/RN generan el boundary.
  const response = await api.post<OrderResponse>(`${API_BASE_URL}/api/orders/${orderId}/photos`, formData);
  return response.data;
};

export const orderService = { createOrder, listOrders, getOrder, updateStatus, getHistory, addPart, addPhotos };
