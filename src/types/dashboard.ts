// src/types/dashboard.ts
export interface PrinterAvailabilityDTO {
  id: number;
  name: string;
  availabilityPercent: number;
}

export interface MonthlyCostDTO {
  month: string; // "YYYY-MM"
  cost: number;
}

export interface PrinterCostDTO {
  id: number;
  name: string;
  totalCost: number;
}

export interface OrderTypeBreakdownDTO {
  preventive: number;
  corrective: number;
  calibration: number;
}

export interface FailingPrinterDTO {
  id: number;
  name: string;
  correctiveCount: number;
  totalCost: number;
}

export interface LowStockPartDTO {
  id: number;
  name: string;
  partNumber: string;
  stock: number;
  minStock: number;
}

export interface DashboardMetricsDTO {
  globalAvailabilityPercent: number;
  availabilityByPrinter: PrinterAvailabilityDTO[];
  totalCost: number;
  totalPartsCost: number;
  totalLaborCost: number;
  costByMonth: MonthlyCostDTO[];
  costByPrinter: PrinterCostDTO[];
  totalOrders: number;
  openOrders: number;
  closedOrders: number;
  byType: OrderTypeBreakdownDTO;
  avgResolutionHours: number;
  overdueOrders: number;
  top3FailingPrinters: FailingPrinterDTO[];
  lowStockParts: LowStockPartDTO[];
  periodFrom: string;
  periodTo: string;
}

// Período seleccionado por el usuario.
export interface Period {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
}

export type PeriodPreset = 'THIS_MONTH' | 'LAST_3_MONTHS' | 'THIS_YEAR' | 'CUSTOM';
