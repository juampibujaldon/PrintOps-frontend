// src/components/home/PrinterCard.tsx
import { memo } from 'react';
import { ChevronRight, MapPin, Printer } from 'lucide-react';
import type { PrinterResponse } from '../../services/printerService';
import { PRINTER_STATUS, getMaintenanceBadge } from '../../constants/printers';
import { Badge, Card } from '../ui';
import styles from './PrinterCard.module.css';

type Props = {
  printer: PrinterResponse;
  onPress: (printer: PrinterResponse) => void;
};

function PrinterCard({ printer, onPress }: Props) {
  const status = PRINTER_STATUS[printer.status];
  const maintenanceBadge = getMaintenanceBadge(printer.nextMaintenanceDate);

  return (
    <Card padded={false} className={styles.card}>
      <button type="button" className={styles.button} onClick={() => onPress(printer)}>
        <span className={styles.thumbnailWrapper}>
          {printer.photoUrl ? (
            <img src={printer.photoUrl} alt="" className={styles.thumbnail} loading="lazy" />
          ) : (
            <span className={styles.thumbnailPlaceholder}>
              <Printer size={26} strokeWidth={1.5} aria-hidden="true" />
            </span>
          )}
        </span>
        <span className={styles.info}>
          <span className={styles.model}>{printer.name || printer.model}</span>
          <span className={styles.brand}>{printer.brand}</span>
          <span className={styles.serial}>{printer.serialNumber}</span>
          {printer.location ? (
            <span className={styles.locationRow}>
              <MapPin size={12} aria-hidden="true" />
              <span className={styles.location}>{printer.location}</span>
            </span>
          ) : null}
          {printer.nextMaintenanceDate ? (
            <span className={styles.maintenance}>Mantenimiento: {printer.nextMaintenanceDate}</span>
          ) : null}
          <span className={styles.badges}>
            <Badge label={status.label} color={status.color} pulse={printer.status === 'OPERATIVE'} />
            {maintenanceBadge ? <Badge label={maintenanceBadge.label} color={maintenanceBadge.color} /> : null}
          </span>
        </span>
        <ChevronRight size={18} className={styles.chevron} aria-hidden="true" />
      </button>
    </Card>
  );
}

export default memo(PrinterCard);
