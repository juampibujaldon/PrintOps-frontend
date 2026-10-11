// src/services/printerComponentService.ts
import { API_BASE_URL } from '../constants/api';
import api from './axiosInstance';

export type ComponentType = 'NOZZLE' | 'HOTEND' | 'BELTS' | 'BEARINGS' | 'HEATBED';
export type ComponentQuality = 'ECONOMY' | 'STANDARD' | 'PREMIUM' | 'CUSTOM';

// Repuesto de desgaste de una impresora: calidad (vida útil) y horas desde que se instaló.
export interface PrinterComponent {
  component: ComponentType;
  label: string;
  quality: ComponentQuality;
  customLifespanHours: number | null;
  standardLifespanHours: number;
  lifespanHours: number;
  // Boquilla: la vida útil varía según el filamento (los valores son para PLA/PETG).
  filamentDependent: boolean;
  hoursUsed: number;
  hoursRemaining: number;
  percent: number;
  replacedAt: string | null;
}

// Mismos multiplicadores que ComponentQuality en el backend.
export const QUALITY_OPTIONS: Array<{ value: ComponentQuality; label: string; hint: string; multiplier?: number }> = [
  { value: 'ECONOMY', label: 'Económica', hint: '60% de la vida útil estándar', multiplier: 0.6 },
  { value: 'STANDARD', label: 'Estándar', hint: 'Repuesto original o equivalente', multiplier: 1 },
  { value: 'PREMIUM', label: 'Premium', hint: '160% (p. ej. boquilla de acero endurecido)', multiplier: 1.6 },
  { value: 'CUSTOM', label: 'Personalizada', hint: 'Cargás las horas de vida útil' },
];

const base = (printerId: number) => `${API_BASE_URL}/api/printers/${printerId}/components`;

const list = async (printerId: number): Promise<PrinterComponent[]> => {
  const { data } = await api.get<PrinterComponent[]>(base(printerId));
  return data;
};

const update = async (
  printerId: number,
  component: ComponentType,
  quality: ComponentQuality,
  customLifespanHours?: number,
): Promise<PrinterComponent> => {
  const { data } = await api.put<PrinterComponent>(`${base(printerId)}/${component}`, {
    quality,
    customLifespanHours: quality === 'CUSTOM' ? customLifespanHours : null,
  });
  return data;
};

// El repuesto se cambió: el contador de horas vuelve a 0.
const replace = async (printerId: number, component: ComponentType): Promise<PrinterComponent> => {
  const { data } = await api.post<PrinterComponent>(`${base(printerId)}/${component}/replace`);
  return data;
};

export const printerComponentService = { list, update, replace };
