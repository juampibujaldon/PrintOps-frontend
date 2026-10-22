// src/hooks/usePrinterById.ts
// Carga una impresora por id (de la URL). Si llegó en location.state.printer (optimización al
// navegar desde una lista) se pinta al instante y se refresca en segundo plano; en una recarga
// de la página simplemente se hace el fetch.
import { useCallback, useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { printerService } from '../services/printerService';
import type { PrinterResponse } from '../services/printerService';

export function parseId(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function usePrinterById() {
  const { printerId: rawId } = useParams();
  const printerId = parseId(rawId);
  const location = useLocation();
  const statePrinter = (location.state as { printer?: PrinterResponse } | null)?.printer;
  const initial = statePrinter && statePrinter.id === printerId ? statePrinter : null;

  const [printer, setPrinter] = useState<PrinterResponse | null>(initial);
  const [loading, setLoading] = useState(!initial);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (mode: 'initial' | 'silent' | 'refresh') => {
      if (printerId == null) {
        setLoading(false);
        setError('No se encontró la impresora.');
        return;
      }
      try {
        if (mode === 'refresh') setRefreshing(true);
        if (mode === 'initial') setLoading(true);
        setError(null);
        setPrinter(await printerService.getById(printerId));
      } catch (e) {
        // En refresco silencioso los datos que ya hay siguen siendo válidos.
        if (mode !== 'silent') {
          setError(
            (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
              'No se pudo cargar la impresora.',
          );
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [printerId],
  );

  useEffect(() => {
    void load(initial ? 'silent' : 'initial');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  return { printerId, printer, setPrinter, loading, refreshing, error, reload: load };
}
