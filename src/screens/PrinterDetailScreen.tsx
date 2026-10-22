// src/screens/PrinterDetailScreen.tsx
import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
  AlertTriangle,
  CalendarClock,
  ChevronRight,
  Clock,
  Download,
  History,
  MapPin,
  Printer,
  RefreshCw,
  SlidersHorizontal,
  Wrench,
  Zap,
} from 'lucide-react';
import { tint } from '../constants/theme';
import { PRINTER_STATUS, daysUntilMaintenance } from '../constants/printers';
import { useAuth } from '../hooks/useAuth';
import { usePrinterById } from '../hooks/usePrinterById';
import { useConfirm } from '../context/ConfirmContext';
import { useToast } from '../context/ToastContext';
import { printerService } from '../services/printerService';
import type { PrinterStatus } from '../services/printerService';
import { downloadBlob } from '../utils/download';
import { qrFileName, svgToBlob, svgToPngBlob } from '../utils/qr';
import { cx } from '../utils/cx';
import { Badge, Button, ErrorState, ScreenHeader, SettingsSection, Skeleton, Spinner } from '../components/ui';
import styles from './PrinterDetailScreen.module.css';

const UNKNOWN_STATUS = { label: 'Sin estado', color: '#AEAEB2' };

// Fechas del backend en formato YYYY-MM-DD (sin hora): se parsean como locales.
const parseDate = (d?: string | null) => {
  if (!d) return null;
  const date = new Date(`${d}T00:00:00`);
  return isNaN(date.getTime()) ? null : date;
};

const formatDate = (d?: string | null) =>
  parseDate(d)?.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' }) ?? null;

export default function PrinterDetailScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const confirm = useConfirm();
  const { showToast } = useToast();
  const isTecnico = user?.role === 'TECNICO';

  const { printer, setPrinter, loading, refreshing, error, reload } = usePrinterById();
  const [changingStatus, setChangingStatus] = useState<PrinterStatus | null>(null);
  const qrWrapRef = useRef<HTMLDivElement>(null);

  const title = printer ? printer.name || printer.model || 'Impresora' : 'Impresora';

  if (loading && !printer) {
    return (
      <>
        <ScreenHeader title="Impresora" backTo="/printers" />
        <div aria-busy="true">
          <Skeleton height={290} className={styles.skeletonHero} />
          <div className={styles.statsRow}>
            <Skeleton height={84} className={styles.skeletonStat} />
            <Skeleton height={84} className={styles.skeletonStat} />
            <Skeleton height={84} className={styles.skeletonStat} />
          </div>
          <Skeleton height={120} className={styles.skeletonBlock} />
        </div>
      </>
    );
  }

  if (!printer) {
    return (
      <>
        <ScreenHeader title="Impresora" backTo="/printers" />
        <ErrorState error={error ?? 'No se encontró la impresora.'} onRetry={() => reload('initial')} />
      </>
    );
  }

  const status = (printer.status && PRINTER_STATUS[printer.status]) || UNKNOWN_STATUS;

  const changeStatus = async (next: PrinterStatus) => {
    if (next === printer.status || changingStatus) return;
    const ok = await confirm({
      title: 'Cambiar estado',
      message: `¿Pasar "${printer.name || printer.model}" a "${PRINTER_STATUS[next].label}"?`,
      confirmLabel: 'Cambiar',
    });
    if (!ok) return;
    setChangingStatus(next);
    try {
      setPrinter(await printerService.updateStatus(printer.id, next));
    } catch (e) {
      const message = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast(message || 'No se pudo cambiar el estado.', { type: 'error', title: 'Error' });
    } finally {
      setChangingStatus(null);
    }
  };

  const daysToMaintenance = daysUntilMaintenance(printer.nextMaintenanceDate);
  const maintenanceAlert =
    daysToMaintenance == null
      ? null
      : daysToMaintenance < 0
        ? {
            color: PRINTER_STATUS.OUT_OF_SERVICE.color,
            title: 'Mantenimiento vencido',
            text: `Venció hace ${-daysToMaintenance} ${-daysToMaintenance === 1 ? 'día' : 'días'}.`,
          }
        : daysToMaintenance <= 7
          ? {
              color: PRINTER_STATUS.MAINTENANCE.color,
              title: 'Mantenimiento próximo',
              text:
                daysToMaintenance === 0
                  ? 'Vence hoy.'
                  : `Vence en ${daysToMaintenance} ${daysToMaintenance === 1 ? 'día' : 'días'}.`,
            }
          : null;

  const info = [
    { label: 'Marca', value: printer.brand },
    { label: 'Modelo', value: printer.model },
    { label: 'N° de serie', value: printer.serialNumber, mono: true },
    { label: 'Ubicación', value: printer.location },
    { label: 'Fecha de compra', value: formatDate(printer.purchaseDate) },
  ].filter((r) => !!r.value) as { label: string; value: string; mono?: boolean }[];

  const base = `/printers/${printer.id}`;
  const navState = { state: { printer } };

  const getQrSvg = () => qrWrapRef.current?.querySelector('svg') ?? null;

  const downloadQr = async (format: 'png' | 'svg') => {
    const svg = getQrSvg();
    if (!svg) return;
    try {
      const blob = format === 'svg' ? svgToBlob(svg) : await svgToPngBlob(svg);
      downloadBlob(blob, qrFileName(printer.serialNumber, format));
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'No se pudo descargar el QR.', { type: 'error' });
    }
  };

  return (
    <>
      <ScreenHeader
        title={title}
        showBack
        backTo="/printers"
        rightContent={
          <Button
            title="Actualizar"
            variant="secondary"
            size="sm"
            fullWidth={false}
            icon={<RefreshCw size={16} />}
            loading={refreshing}
            onPress={() => reload('refresh')}
          />
        }
      />

      {error ? (
        <p className={styles.inlineError} role="alert">
          {error}
        </p>
      ) : null}

      <div className={styles.layout}>
        <div className={styles.column}>
          {/* Hero */}
          <div className={styles.heroCard}>
            {printer.photoUrl ? (
              <img src={printer.photoUrl} alt={`Foto de ${title}`} className={styles.heroImage} />
            ) : (
              <div className={cx(styles.heroImage, styles.heroPlaceholder)} style={{ backgroundColor: tint(status.color, 0.1), color: status.color }}>
                <Printer size={56} strokeWidth={1.25} aria-hidden="true" />
              </div>
            )}
            <div className={styles.heroBody}>
              <div className={styles.heroTitleRow}>
                <div className={styles.heroTitles}>
                  <h2 className={styles.title}>{title}</h2>
                  <p className={styles.subtitle}>{[printer.brand, printer.model].filter(Boolean).join(' · ')}</p>
                </div>
                <Badge label={status.label} color={status.color} pulse={printer.status === 'OPERATIVE'} />
              </div>
              {printer.location ? (
                <div className={styles.locationRow}>
                  <MapPin size={16} aria-hidden="true" />
                  <span>{printer.location}</span>
                </div>
              ) : null}
            </div>
          </div>

          {/* Alerta de mantenimiento */}
          {maintenanceAlert ? (
            <div className={styles.alert} style={{ backgroundColor: tint(maintenanceAlert.color, 0.12) }} role="status">
              <AlertTriangle size={20} strokeWidth={2} style={{ color: maintenanceAlert.color }} aria-hidden="true" />
              <div>
                <p className={styles.alertTitle} style={{ color: maintenanceAlert.color }}>
                  {maintenanceAlert.title}
                </p>
                <p className={styles.alertText}>{maintenanceAlert.text}</p>
              </div>
            </div>
          ) : null}

          {/* Estado */}
          <div className={styles.statusPicker}>
            <span id="printer-status-label" className={styles.statusPickerTitle}>
              ESTADO
            </span>
            <div className={styles.segmented} role="group" aria-labelledby="printer-status-label">
              {(Object.keys(PRINTER_STATUS) as PrinterStatus[]).map((key) => {
                const opt = PRINTER_STATUS[key];
                const active = printer.status === key;
                return (
                  <button
                    key={key}
                    type="button"
                    className={cx(styles.segment, active && styles.segmentActive)}
                    onClick={() => void changeStatus(key)}
                    disabled={!!changingStatus}
                    aria-pressed={active}
                    aria-label={`Estado ${opt.label}`}
                  >
                    {changingStatus === key ? (
                      <Spinner size={16} color={opt.color} />
                    ) : (
                      <>
                        <span className={styles.segmentDot} style={{ backgroundColor: opt.color }} aria-hidden="true" />
                        <span className={styles.segmentText}>{opt.label}</span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Métricas */}
          <div className={styles.statsRow}>
            <StatTile
              icon={<Clock size={20} strokeWidth={1.75} style={{ color: 'var(--color-primary)' }} />}
              value={printer.totalPrintingHours != null ? `${Math.round(printer.totalPrintingHours)} h` : '—'}
              label="Horas de uso"
            />
            <StatTile
              icon={<Zap size={20} strokeWidth={1.75} style={{ color: 'var(--color-orange)' }} />}
              value={printer.watts != null ? `${printer.watts} W` : '—'}
              label="Consumo"
            />
            <StatTile
              icon={
                <CalendarClock
                  size={20}
                  strokeWidth={1.75}
                  style={{ color: maintenanceAlert?.color ?? 'var(--color-green)' }}
                />
              }
              value={daysToMaintenance == null ? '—' : daysToMaintenance < 0 ? 'Vencido' : `${daysToMaintenance} d`}
              label="Próx. mant."
            />
          </div>
        </div>

        <div className={styles.column}>
          {/* Acciones */}
          <div className={styles.actions}>
            {isTecnico ? (
              <Button
                title="Nueva orden de mantenimiento"
                icon={<Wrench size={20} strokeWidth={2} />}
                onPress={() => navigate(`${base}/orders/new`, navState)}
              />
            ) : null}
            <div className={styles.actionsGrid}>
              <ActionTile
                to={`${base}/rules`}
                state={navState.state}
                icon={<Wrench size={20} strokeWidth={1.75} />}
                label="Reglas"
                caption="Mantenimiento preventivo"
              />
              <ActionTile
                to={`${base}/history`}
                state={navState.state}
                icon={<History size={20} strokeWidth={1.75} />}
                label="Historial"
                caption="Órdenes y repuestos"
              />
              <ActionTile
                to={`${base}/components`}
                state={navState.state}
                icon={<SlidersHorizontal size={20} strokeWidth={1.75} />}
                label="Vida útil de repuestos"
                caption="Calidad, desgaste y reemplazos"
              />
            </div>
          </div>

          {/* Información */}
          {info.length > 0 ? (
            <SettingsSection title="Información">
              <dl className={styles.infoList}>
                {info.map((r) => (
                  <div key={r.label} className={styles.infoRow}>
                    <dt className={styles.infoLabel}>{r.label}</dt>
                    <dd className={cx(styles.infoValue, r.mono && styles.mono)}>{r.value}</dd>
                  </div>
                ))}
              </dl>
            </SettingsSection>
          ) : null}

          {/* QR */}
          {printer.qrCodeData ? (
            <SettingsSection title="Código QR" footer="Escaneá este código desde la app para abrir esta impresora.">
              <div className={styles.qrBox}>
                <div className={styles.qrFrame} ref={qrWrapRef}>
                  <QRCodeSVG
                    value={printer.qrCodeData}
                    size={168}
                    marginSize={2}
                    bgColor="#FFFFFF"
                    fgColor="#1C1C1E"
                    role="img"
                    title={`Código QR de ${printer.serialNumber}`}
                  />
                </div>
                <p className={styles.qrCaption}>{printer.serialNumber}</p>
                <div className={styles.qrActions}>
                  <Button
                    title="Descargar PNG"
                    variant="secondary"
                    size="sm"
                    fullWidth={false}
                    icon={<Download size={16} />}
                    onPress={() => void downloadQr('png')}
                  />
                  <Button
                    title="Descargar SVG"
                    variant="secondary"
                    size="sm"
                    fullWidth={false}
                    icon={<Download size={16} />}
                    onPress={() => void downloadQr('svg')}
                  />
                </div>
              </div>
            </SettingsSection>
          ) : null}
        </div>
      </div>
    </>
  );
}

function StatTile({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return (
    <div className={styles.statTile}>
      {icon}
      <span className={styles.statValue}>{value}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}

function ActionTile({
  to,
  state,
  icon,
  label,
  caption,
}: {
  to: string;
  state?: unknown;
  icon: ReactNode;
  label: string;
  caption: string;
}) {
  return (
    <Link to={to} state={state} className={styles.actionTile}>
      <span className={styles.actionIcon}>{icon}</span>
      <span className={styles.actionText}>
        <span className={styles.actionLabel}>{label}</span>
        <span className={styles.actionCaption}>{caption}</span>
      </span>
      <ChevronRight size={16} className={styles.actionChevron} aria-hidden="true" />
    </Link>
  );
}
