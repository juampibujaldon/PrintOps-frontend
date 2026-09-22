// src/types/rules.ts
export type TriggerType = 'TIME_BASED' | 'USAGE_HOURS' | 'FILAMENT_GRAMS';

export type MaintenanceType = 'PREVENTIVE' | 'CORRECTIVE' | 'CALIBRATION';

// DTO de salida que devuelve el backend (US-06).
export interface MaintenanceRuleDTO {
  id: number;
  printerId: number;
  printerName: string;
  triggerType: TriggerType;
  triggerValue: number;
  alertDaysBefore: number;
  maintenanceType: MaintenanceType;
  checklistItems: string[];
  active: boolean;
  lastTriggeredAt: string | null;
  createdById: number | null;
  createdAt: string;
  progressPercent: number;
  nextTriggerEstimate: string | null;
  currentValue: number | null;
  totalPrintingHours: number;
  totalFilamentGrams: number;
}

// Payload para crear una regla.
export interface CreateRuleInput {
  printerId: number;
  triggerType: TriggerType;
  triggerValue: number;
  alertDaysBefore?: number;
  maintenanceType: MaintenanceType;
  checklistItems: string[];
}
