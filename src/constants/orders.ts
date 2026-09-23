// src/constants/orders.ts
import { Colors } from './theme';
import { OrderStatus, OrderType } from '../services/orderService';

export const ORDER_STATUS: Record<OrderStatus, { label: string; color: string }> = {
  PENDING: { label: 'Pendiente', color: Colors.orderPending },
  IN_PROGRESS: { label: 'En progreso', color: Colors.orderInProgress },
  IN_REVIEW: { label: 'En revisión', color: Colors.orderInReview },
  COMPLETED: { label: 'Completada', color: Colors.orderCompleted },
  CANCELLED: { label: 'Cancelada', color: Colors.orderCancelled },
};

// Colores semánticos para los tipos de orden (US-historial).
export const ORDER_TYPE: Record<OrderType, { label: string; color: string }> = {
  PREVENTIVE: { label: 'Preventivo', color: '#606c38' },   // olive
  CORRECTIVE: { label: 'Correctivo', color: '#bc6c25' },   // copperwood
  CALIBRATION: { label: 'Calibración', color: '#dda15e' }, // sunlit_clay
};
