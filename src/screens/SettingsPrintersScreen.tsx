// src/screens/SettingsPrintersScreen.tsx
// Configuración › Impresoras y Mantenimiento: estado de cada impresora, su próximo
// mantenimiento y acceso directo al detalle y a la vida útil de sus repuestos.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, MapPin, Plus, Printer as PrinterIcon, RefreshCw, SlidersHorizontal } from 'lucide-react';
import { Colors, tint } from '../constants/theme';
import { PRINTER_STATUS, daysUntilMaintenance } from '../constants/printers';
import { printerService } from '../services/printerService';
import type { PrinterResponse } from '../services/printerService';
import { useAuth } from '../hooks/useAuth';
import { Button, EmptyState, ErrorState, IconButton, ScreenHeader, Skeleton, Spinner } from '../components/ui';
import styles from './SettingsPrintersScreen.module.css';

const TITLE = 'Impresoras y Mantenimiento';

function maintenanceLabel(date: string | null): { text: string; color: string } {
  const days = daysUntilMaintenance(date);
  if (days == null) return { text: 'Sin mantenimiento programado', color: Colors.textTertiary };
  if (days < 0) return { text: `Mantenimiento vencido hace ${-days} d`, color: Colors.statusFuera };
  if (days === 0) return { text: 'Mantenimiento hoy', color: Colors.statusMantenim };
  if (days <= 7) return { text: `Mantenimiento en ${days} d`, color: Colors.statusMantenim };
  return {
    text: `Próximo mantenimiento: ${new Date(`${date}T00:00:00`).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}`,
    color: Colors.textSecondary,
  };
}

export default function SettingsPrintersScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isManager = user?.role === 'MANAGER';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [printers, setPrinters] = useState<PrinterResponse[]>([]);
  const loaded = useRef(false);

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      setError(null);
      setPrinters(await printerService.getAllPrinters());
      loaded.current = true;
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message || 'Error al cargar impresoras');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
    // Al volver a la pestaña (p. ej. tras cambiar el estado de una impresora) se refresca sin skeleton.
    const onVisible = () => {
      if (document.visibilityState === 'visible' && loaded.current) void load(true);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [load]);

  const header = (
    <ScreenHeader
      title={TITLE}
      showBack
      backTo="/settings"
      rightContent={
        loaded.current ? (
          <IconButton
            icon={refreshing ? <Spinner size={20} /> : <RefreshCw size={20} strokeWidth={1.75} />}
            label="Actualizar"
            onPress={() => load(true)}
            disabled={refreshing}
          />
        ) : undefined
      }
    />
  );

  if (loading && printers.length === 0) {
    return (
      <>
        {header}
        <div className={styles.content}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className={styles.skeleton} />
          ))}
        </div>
      </>
    );
  }

  if (error && printers.length === 0) {
    return (
      <>
        {header}
        <ErrorState error={error} onRetry={() => load()} />
      </>
    );
  }

  const dueCount = printers.filter((p) => {
    const d = daysUntilMaintenance(p.nextMaintenanceDate);
    return d != null && d <= 7;
  }).length;

  return (
    <>
      {header}
      <div className={styles.content}>
        {printers.length === 0 ? (
          <EmptyState
            icon={<PrinterIcon color={Colors.textTertiary} size={44} strokeWidth={1.5} />}
            title="Sin impresoras"
            description="Registrá tu primera impresora para empezar a controlar su mantenimiento."
          />
        ) : (
          <>
            <p className={styles.summary}>
              {printers.length} {printers.length === 1 ? 'impresora' : 'impresoras'}
              {dueCount > 0 ? ` · ${dueCount} con mantenimiento vencido o esta semana` : ''}
            </p>
            <div className={styles.grid}>
              {printers.map((p) => (
                <PrinterCard key={p.id} printer={p} />
              ))}
            </div>
          </>
        )}
        {isManager && (
          <Button
            title="Agregar impresora"
            variant="tinted"
            fullWidth={false}
            icon={<Plus color={Colors.primary} size={20} strokeWidth={2} />}
            onPress={() => navigate('/printers/new')}
            className={styles.addBtn}
          />
        )}
      </div>
    </>
  );
}

function PrinterCard({ printer }: { printer: PrinterResponse }) {
  const status = PRINTER_STATUS[printer.status] ?? { label: 'Sin estado', color: Colors.statusUnknown };
  const maintenance = maintenanceLabel(printer.nextMaintenanceDate);
  const name = printer.name || printer.model;

  return (
    <div className={styles.card}>
      <Link
        to={`/printers/${printer.id}`}
        state={{ printer }}
        className={styles.cardMain}
        aria-label={`${name}, ${status.label}`}
      >
        <span className={styles.iconWrap} style={{ backgroundColor: tint(status.color, 0.14) }}>
          <PrinterIcon color={status.color} size={20} strokeWidth={1.75} />
        </span>
        <span className={styles.info}>
          <span className={styles.name}>{printer.name || `${printer.brand} ${printer.model}`}</span>
          <span className={styles.meta}>
            {printer.brand} {printer.model}
          </span>
          {printer.location ? (
            <span className={styles.locationRow}>
              <MapPin color={Colors.textTertiary} size={12} strokeWidth={2} aria-hidden="true" />
              <span className={styles.meta}>{printer.location}</span>
            </span>
          ) : null}
        </span>
        <span className={styles.statusPill} style={{ backgroundColor: tint(status.color, 0.14), color: status.color }}>
          {status.label}
        </span>
        <ChevronRight color={Colors.textTertiary} size={18} aria-hidden="true" />
      </Link>
      <div className={styles.cardFooter}>
        <span className={styles.maintenance} style={{ color: maintenance.color }}>
          {maintenance.text}
        </span>
        <Link
          to={`/printers/${printer.id}/components`}
          state={{ printerName: name }}
          className={styles.componentsBtn}
          aria-label={`Vida útil de repuestos de ${name}`}
        >
          <SlidersHorizontal color={Colors.primary} size={16} strokeWidth={2} aria-hidden="true" />
          Repuestos
        </Link>
      </div>
    </div>
  );
}
