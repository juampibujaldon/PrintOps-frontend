import api from './axiosInstance';
import type { PurchaseOrder, PurchaseOrderRequest, Supplier, SupplierInput } from '../api/types';
import type { SparePartDTO } from '../types/parts';

const list = async (): Promise<Supplier[]> => (await api.get<Supplier[]>('/api/suppliers')).data;
const create = async (body: SupplierInput) => (await api.post<Supplier>('/api/suppliers', body)).data;
const update = async (id: number, body: SupplierInput) => (await api.put<Supplier>(`/api/suppliers/${id}`, body)).data;
const remove = async (id: number) => {
  await api.delete(`/api/suppliers/${id}`);
};
const assignToPart = async (partId: number, supplierId: number | null) =>
  (await api.patch<SparePartDTO>(`/api/parts/${partId}/supplier`, { supplierId })).data;

const orders = async (): Promise<PurchaseOrder[]> => (await api.get<PurchaseOrder[]>('/api/purchase-orders')).data;
const order = async (id: number) => (await api.get<PurchaseOrder>(`/api/purchase-orders/${id}`)).data;
const createOrder = async (body: PurchaseOrderRequest) => (await api.post<PurchaseOrder>('/api/purchase-orders', body)).data;
const updateOrder = async (id: number, body: PurchaseOrderRequest) =>
  (await api.put<PurchaseOrder>(`/api/purchase-orders/${id}`, body)).data;
const suggest = async () => (await api.post<PurchaseOrder[]>('/api/purchase-orders/suggest')).data;
const send = async (id: number) => (await api.post<PurchaseOrder>(`/api/purchase-orders/${id}/send`)).data;
const receive = async (id: number) => (await api.post<PurchaseOrder>(`/api/purchase-orders/${id}/receive`)).data;
const cancel = async (id: number) => (await api.post<PurchaseOrder>(`/api/purchase-orders/${id}/cancel`)).data;
const removeOrder = async (id: number) => {
  await api.delete(`/api/purchase-orders/${id}`);
};

export const supplierService = {
  list, create, update, remove, assignToPart,
  orders, order, createOrder, updateOrder, suggest, send, receive, cancel, removeOrder,
};
