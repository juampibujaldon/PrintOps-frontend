import type { ReactNode } from 'react';
import { AlertTriangle, CalendarClock, ClipboardList, MapPin, Printer } from 'lucide-react';
import { Colors, tint } from '../../constants/theme';
import { PRINTER_STATUS, daysUntilMaintenance } from '../../constants/printers';
import type { PrinterResponse } from '../../services/printerService';
import { Badge, Button, Modal } from '../ui';
import styles from './PrinterQuickSheet.module.css';

interface Props {
  printer: PrinterResponse | null;
  openOrders: number;
  canCreateOrder: boolean;
  onClose: () => void;
  onOpenDetail: (printer: PrinterResponse) => void;
  onCreateOrder: (printer: PrinterResponse) => void;
}

const maintenanceText = (days: number | null) => {
  if (days == null) return 'Sin fecha programada';
  if (days < 0) return `Vencido hace ${-days} ${-days === 1 ? 'día' : 'días'}`;
  if (days === 0) return 'Vence hoy';
  return `En ${days} ${days === 1 ? 'día' : 'días'}`;
};

// Ficha rápida de una impresora del plano: estado, mantenimiento y acciones,
// sin salir del Taller. En mobile el Modal se ve como hoja inferior.
export default function PrinterQuickSheet({ printer, openOrders, canCreateOrder, onClose, onOpenDetail, onCreateOrder }: Props) {
  const status = printer ? PRINTER_STATUS[printer.status] ?? { label: 'Sin estado', color: Colors.statusUnknown } : null;
  const days = printer ? daysUntilMaintenance(printer.nextMaintenanceDate) : null;
  const urgent = days != null && days <= 7;
  const maintColor = days == null ? undefined : days < 0 ? Colors.statusFuera : urgent ? Colors.statusMantenim : undefined;

  return (
    <Modal
      open={!!printer}
      onClose={onClose}
      size="sm"
      title={printer ? printer.name || printer.model : undefined}
      footer={
        printer ? (
          <>
            <Button title="Ver detalle" variant={canCreateOrder ? 'tinted' : 'primary'} fullWidth={false} onPress={() => onOpenDetail(printer)} />
            {canCreateOrder ? <Button title="Nueva orden" fullWidth={false} onPress={() => onCreateOrder(printer)} /> : null}
          </>
        ) : null
      }
    >
      {printer && status ? (
        <>
          <div className={styles.header}>
            {printer.photoUrl ? (
              <img src={printer.photoUrl} alt="" className={styles.thumb} />
            ) : (
              <div className={styles.thumb} style={{ backgroundColor: tint(status.color, 0.12) }}>
                <Printer color={status.color} size={26} strokeWidth={1.5} />
              </div>
            )}
            <div className={styles.headerText}>
              <p className={styles.subtitle}>
                {printer.brand} · {printer.model}
              </p>
              <Badge label={status.label} color={status.color} pulse={printer.status === 'OPERATIVE'} />
            </div>
          </div>

          <dl className={styles.info}>
            <InfoLine
              icon={
                urgent ? (
                  <AlertTriangle color={maintColor} size={18} strokeWidth={2} />
                ) : (
                  <CalendarClock color={Colors.textSecondary} size={18} strokeWidth={1.75} />
                )
              }
              label="Próximo mantenimiento"
              value={maintenanceText(days)}
              valueColor={maintColor}
            />
            <InfoLine icon={<ClipboardList color={Colors.textSecondary} size={18} strokeWidth={1.75} />} label="Órdenes abiertas" value={String(openOrders)} />
            {printer.location ? (
              <InfoLine icon={<MapPin color={Colors.textSecondary} size={18} strokeWidth={1.75} />} label="Ubicación" value={printer.location} />
            ) : null}
          </dl>
        </>
      ) : null}
    </Modal>
  );
}

function InfoLine({ icon, label, value, valueColor }: { icon: ReactNode; label: string; value: string; valueColor?: string }) {
  return (
    <div className={styles.line}>
      <dt className={styles.label}>
        {icon}
        <span>{label}</span>
      </dt>
      <dd className={styles.value} style={valueColor ? { color: valueColor } : undefined}>
        {value}
      </dd>
    </div>
  );
}
