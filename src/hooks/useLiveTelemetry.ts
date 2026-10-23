import { useEffect, useState } from 'react';
import { integrationService } from '../services/integrationService';
import { webSocketService } from '../services/webSocketService';
import type { PrinterTelemetry } from '../api/types';

// Estado en vivo de las impresoras integradas: carga inicial + actualizaciones por
// WebSocket (mensajes "telemetry" que manda el backend cuando reporta el agente local).
export function useLiveTelemetry(): Map<number, PrinterTelemetry> {
  const [byPrinter, setByPrinter] = useState<Map<number, PrinterTelemetry>>(new Map());

  useEffect(() => {
    let cancelled = false;
    integrationService
      .telemetry()
      .then((list) => !cancelled && setByPrinter(new Map(list.map((t) => [t.printerId, t]))))
      .catch(() => {});
    const unsubscribe = webSocketService.subscribe((msg) => {
      if (msg.type !== 'telemetry' || typeof msg.printerId !== 'number') return;
      const t = msg as unknown as PrinterTelemetry;
      setByPrinter((prev) => new Map(prev).set(t.printerId, t));
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return byPrinter;
}

// Ejecuta `onEvent` cuando llega un mensaje en vivo del tipo indicado (p. ej. "jobs").
export function useLiveEvent(type: string, onEvent: () => void): void {
  useEffect(
    () =>
      webSocketService.subscribe((msg) => {
        if (msg.type === type) onEvent();
      }),
    [type, onEvent],
  );
}
