import { Activity, Thermometer, Timer } from 'lucide-react';
import { SettingsSection } from '../ui';
import type { PrinterTelemetry } from '../../api/types';
import styles from './PrinterIntegration.module.css';

const LABEL: Record<string, string> = {
  PRINTING: 'Imprimiendo',
  PAUSED: 'En pausa',
  FINISHED: 'Terminó el trabajo',
  ERROR: 'Error',
  IDLE: 'Lista para imprimir',
  OFFLINE: 'Sin conexión con el agente',
};

const hm = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
};

// Estado en vivo reportado por el agente local (solo si la impresora está integrada).
export default function PrinterLiveCard({ telemetry }: { telemetry: PrinterTelemetry }) {
  const printing = telemetry.state === 'PRINTING' || telemetry.state === 'PAUSED';
  return (
    <SettingsSection title="En vivo" footer={`Actualizado ${new Date(telemetry.updatedAt).toLocaleTimeString('es-AR')}`}>
      <div className={styles.live}>
        <p className={styles.liveState} data-state={telemetry.state}>
          <Activity size={18} aria-hidden="true" /> {LABEL[telemetry.state] ?? telemetry.state}
          {printing && telemetry.progress != null ? ` · ${Math.round(telemetry.progress)}%` : ''}
        </p>
        {printing && telemetry.progress != null && (
          <div className={styles.progress} role="progressbar" aria-label="Progreso" aria-valuenow={Math.round(telemetry.progress)} aria-valuemin={0} aria-valuemax={100}>
            <div style={{ width: `${telemetry.progress}%` }} />
          </div>
        )}
        {telemetry.jobName && <p className={styles.liveLine}>{telemetry.jobName}</p>}
        <div className={styles.liveStats}>
          {telemetry.nozzleTemp != null && (
            <span><Thermometer size={15} aria-hidden="true" /> Boquilla {Math.round(telemetry.nozzleTemp)} °C</span>
          )}
          {telemetry.bedTemp != null && (
            <span><Thermometer size={15} aria-hidden="true" /> Cama {Math.round(telemetry.bedTemp)} °C</span>
          )}
          {printing && telemetry.remainingSeconds != null && (
            <span><Timer size={15} aria-hidden="true" /> Quedan {hm(telemetry.remainingSeconds)}</span>
          )}
        </div>
        {telemetry.message && <p className={styles.liveMessage}>{telemetry.message}</p>}
      </div>
    </SettingsSection>
  );
}
