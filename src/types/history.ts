// src/types/history.ts
export type OrderType = 'PREVENTIVE' | 'CORRECTIVE' | 'CALIBRATION';

export type OrderStatus = 'PENDING' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED' | 'CANCELLED';

export interface PartUsedDTO {
  partId: number | null;
  partName: string | null;
  partNumber: string | null;
  quantity: number;
  cost: number;
}

export interface OrderHistoryItemDTO {
  id: number;
  orderNumber: string;
  type: OrderType;
  status: OrderStatus;
  description: string | null;
  createdAt: string;
  closedAt: string | null;
  actualMinutes: number | null;
  technicianName: string | null;
  partsUsed: PartUsedDTO[];
  photoUrls: string[];
  partsCost: number;
}

export interface PrinterSummaryDTO {
  id: number;
  name: string | null;
  brand: string;
  model: string;
  serialNumber: string;
}

export interface PrinterMetricsDTO {
  totalInterventions: number;
  totalCost: number;
  preventiveCount: number;
  correctiveCount: number;
  calibrationCount: number;
  mtbfDays: number | null;
  mostReplacedPartName: string | null;
  mostReplacedPartCount: number;
}

export interface PrinterHistoryDTO {
  printer: PrinterSummaryDTO;
  metrics: PrinterMetricsDTO;
  orders: OrderHistoryItemDTO[];
  totalPages: number;
  currentPage: number;
}

export interface PartUsageSummaryDTO {
  partId: number;
  partName: string;
  partNumber: string;
  totalQuantityUsed: number;
  totalCost: number;
}

// Filtros del historial (valores que el usuario elige en pantalla).
export interface HistoryFiltersState {
  type: OrderType | null;
  from: string | null; // YYYY-MM-DD
  to: string | null; // YYYY-MM-DD
}
