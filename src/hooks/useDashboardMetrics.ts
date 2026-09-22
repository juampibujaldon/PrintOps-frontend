// src/hooks/useDashboardMetrics.ts
import { useCallback, useEffect, useState } from 'react';
import { metricsService } from '../services/metricsService';
import { DashboardMetricsDTO, Period } from '../types/dashboard';

function toIso(d: Date): string {
  return d.toISOString().split('T')[0];
}

// Período por defecto: inicio del mes actual → hoy.
function defaultPeriod(): Period {
  const now = new Date();
  return { from: toIso(new Date(now.getFullYear(), now.getMonth(), 1)), to: toIso(now) };
}

export function useDashboardMetrics() {
  const [metrics, setMetrics] = useState<DashboardMetricsDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>(defaultPeriod);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await metricsService.getDashboardMetrics(period.from, period.to);
      setMetrics(data);
    } catch {
      setError('No se pudieron cargar las métricas.');
    } finally {
      setIsLoading(false);
    }
  }, [period.from, period.to]);

  // Carga al montar y al cambiar el período.
  useEffect(() => {
    refetch();
  }, [refetch]);

  return { metrics, isLoading, error, refetch, period, setPeriod };
}
