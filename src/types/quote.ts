// src/types/quote.ts

export type FilamentType = 'PLA' | 'ABS' | 'PETG' | 'TPU' | 'ASA' | 'OTHER';
export type QuoteStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED';

export const FILAMENT_TYPES: FilamentType[] = ['PLA', 'ABS', 'PETG', 'TPU', 'ASA', 'OTHER'];

export interface ComponentWear {
  percent: number;
  hoursUsed: number;
  hoursRemaining: number;
  critical: boolean;
}

export interface WearResults {
  nozzle: ComponentWear;
  hotend: ComponentWear;
  belts: ComponentWear;
  bearings: ComponentWear;
  heatbed: ComponentWear;
}

// Entrada del formulario de cálculo (US-11).
export interface QuoteInputs {
  filamentGrams: number;
  filamentPricePerGram: number;
  filamentType: FilamentType;
  printerWatts: number;
  energyPriceKwh: number;
  printingHours: number;
  designHours?: number;
  designHourlyRate?: number;
  operatorHourlyRate?: number;
  marginPercent: number;
  discountPercent?: number;
  units: number;
  printerId?: number | null;
  clientName?: string;
  jobDescription?: string;
}

export interface QuoteResults {
  filamentCost: number;
  energyCost: number;
  designCost: number;
  operatorCost: number;
  totalCost: number;
  unitPrice: number;
  totalPrice: number;
  totalProfit: number;
  roi: number;
}

// Presupuesto persistido (respuesta del backend).
export interface Quote {
  id: number;
  quoteNumber: string;
  clientName: string | null;
  jobDescription: string | null;
  units: number;
  filamentGrams: number;
  filamentPricePerGram: number;
  filamentType: FilamentType;
  printerWatts: number;
  energyPriceKwh: number;
  printingHours: number;
  designHours: number | null;
  designHourlyRate: number | null;
  operatorHourlyRate: number | null;
  marginPercent: number;
  discountPercent: number | null;
  filamentCost: number;
  energyCost: number;
  designCost: number;
  operatorCost: number;
  totalCost: number;
  unitPrice: number;
  totalPrice: number;
  totalProfit: number;
  roi: number;
  componentWear: WearResults | null;
  printerId: number | null;
  printerName: string | null;
  status: QuoteStatus;
  createdAt: string;
  pdfUrl: string | null;
}

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  DRAFT: 'Borrador',
  SENT: 'Enviado',
  ACCEPTED: 'Aceptado',
  REJECTED: 'Rechazado',
};

export const QUOTE_STATUS_COLORS: Record<QuoteStatus, string> = {
  DRAFT: '#8E8E93',
  SENT: '#0A84FF',
  ACCEPTED: '#34C759',
  REJECTED: '#FF3B30',
};
