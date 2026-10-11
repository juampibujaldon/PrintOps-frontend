// src/constants/printers.ts
import { Colors } from './theme';
import { PrinterStatus } from '../services/printerService';

export const PRINTER_STATUS: Record<PrinterStatus, { label: string; color: string }> = {
  OPERATIVE: { label: 'Operativa', color: Colors.statusOperativa },
  MAINTENANCE: { label: 'En Mantenimiento', color: Colors.statusMantenim },
  OUT_OF_SERVICE: { label: 'Fuera de Servicio', color: Colors.statusFuera },
};

// Días hasta el próximo mantenimiento (negativo = vencido); null si no hay fecha válida.
export function daysUntilMaintenance(nextMaintenanceDate?: string | null): number | null {
  if (!nextMaintenanceDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const next = new Date(`${nextMaintenanceDate}T00:00:00`);
  if (isNaN(next.getTime())) return null;
  return Math.ceil((next.getTime() - today.getTime()) / 86400000);
}

// Badge de alerta según la fecha del próximo mantenimiento.
export function getMaintenanceBadge(
  nextMaintenanceDate?: string | null,
): { label: string; color: string } | null {
  const diffDays = daysUntilMaintenance(nextMaintenanceDate);
  if (diffDays == null) return null;

  if (diffDays < 0) {
    return { label: 'Mantenimiento vencido', color: Colors.statusFuera };
  }
  if (diffDays <= 7) {
    return { label: 'Próximo', color: Colors.statusMantenim };
  }
  return null;
}
