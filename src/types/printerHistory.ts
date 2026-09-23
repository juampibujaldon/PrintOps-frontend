// src/types/printerHistory.ts
import { OrderType, OrderStatus } from '../services/orderService';

export interface PrinterSummary {
  id: number;
  name: string | null;
  model: string;
  serialNumber: string;
  totalHours: number | null;
}

export interface PrinterMetrics {
  totalInterventions: number;
  totalCost: number;
  preventiveCount: number;
  correctiveCount: number;
  calibrationCount: number;
  mtbfDays: number | null;
  mostReplacedPartName: string | null;
  mostReplacedPartCount: number;
}

export interface PartUsed {
  partName: string;
  quantity: number;
  unitCost: number;
}

export interface OrderHistoryItem {
  id: number;
  orderNumber: string;
  type: OrderType;
  status: OrderStatus;
  description: string | null;
  createdAt: string;
  closedAt: string | null;
  actualMinutes: number | null;
  technicianName: string | null;
  partsUsed: PartUsed[];
  photoUrls: string[];
  partsCost: number;
}

export interface PartUsageSummary {
  partId: number | null;
  partName: string;
  partNumber: string;
  totalQuantityUsed: number;
  totalCost: number;
}

export interface PrinterHistory {
  printer: PrinterSummary;
  metrics: PrinterMetrics;
  orders: OrderHistoryItem[];
  totalPages: number;
  currentPage: number;
}

export interface HistoryFilters {
  type: OrderType | null;
  from: string | null; // YYYY-MM-DD
  to: string | null;   // YYYY-MM-DD
  page: number;
  size: number;
}
