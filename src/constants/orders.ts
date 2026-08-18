// src/constants/orders.ts
import { Colors } from './theme';
import { OrderStatus } from '../services/orderService';

export const ORDER_STATUS: Record<OrderStatus, { label: string; color: string }> = {
  PENDING: { label: 'Pendiente', color: Colors.orderPending },
  IN_PROGRESS: { label: 'En progreso', color: Colors.orderInProgress },
  IN_REVIEW: { label: 'En revisión', color: Colors.orderInReview },
  COMPLETED: { label: 'Completada', color: Colors.orderCompleted },
  CANCELLED: { label: 'Cancelada', color: Colors.orderCancelled },
};
