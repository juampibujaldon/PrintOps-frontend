// src/hooks/useDashboardData.ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { metricsService } from '../services/metricsService';
import { printerService, PrinterResponse } from '../services/printerService';
import { orderService, OrderResponse, OrderStatus } from '../services/orderService';
import { partService } from '../services/partService';
import { quoteService } from '../services/quoteService';
import { daysUntilMaintenance } from '../constants/printers';
import { DashboardMetricsDTO, Period, PeriodPreset } from '../types/dashboard';
import { SparePartDTO } from '../types/parts';
import { Quote } from '../types/quote';

// ─── Períodos ────────────────────────────────────────────────────────────────
// Fecha local YYYY-MM-DD. toISOString() usa UTC y, en Argentina después de las
// 21 h, devolvía el día siguiente.
export function isoDate(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

const parse = (s: string) => new Date(`${s}T00:00:00`);

export function computePeriod(p: PeriodPreset, custom?: Period): Period {
  const now = new Date();
  switch (p) {
    case 'THIS_MONTH':
      return { from: isoDate(new Date(now.getFullYear(), now.getMonth(), 1)), to: isoDate(now) };
    case 'LAST_3_MONTHS':
      return { from: isoDate(new Date(now.getFullYear(), now.getMonth() - 2, 1)), to: isoDate(now) };
    case 'THIS_YEAR':
      return { from: isoDate(new Date(now.getFullYear(), 0, 1)), to: isoDate(now) };
    case 'CUSTOM':
      return custom ?? { from: isoDate(now), to: isoDate(now) };
  }
}

// Período de comparación: el mismo tramo en el período anterior (1–10 oct se
// compara con 1–10 sep, no con los 10 días previos), así los deltas son justos.
export function previousPeriod(p: PeriodPreset, current: Period): Period {
  const shiftMonths = (s: string, months: number) => {
    const d = parse(s);
    const target = new Date(d.getFullYear(), d.getMonth() + months, 1);
    const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
    return isoDate(new Date(target.getFullYear(), target.getMonth(), Math.min(d.getDate(), lastDay)));
  };
  switch (p) {
    case 'THIS_MONTH':
      return { from: shiftMonths(current.from, -1), to: shiftMonths(current.to, -1) };
    case 'LAST_3_MONTHS':
      return { from: shiftMonths(current.from, -3), to: shiftMonths(current.to, -3) };
    case 'THIS_YEAR':
      return { from: shiftMonths(current.from, -12), to: shiftMonths(current.to, -12) };
    case 'CUSTOM': {
      const days = Math.round((parse(current.to).getTime() - parse(current.from).getTime()) / 86400000) + 1;
      const to = new Date(parse(current.from).getTime() - 86400000);
      const from = new Date(to.getTime() - (days - 1) * 86400000);
      return { from: isoDate(from), to: isoDate(to) };
    }
  }
}

// ─── Derivados ───────────────────────────────────────────────────────────────
const OPEN_STATUSES: OrderStatus[] = ['PENDING', 'IN_PROGRESS', 'IN_REVIEW'];
// Mismo criterio que el backend (GlobalMetricsService): abierta hace más de 7 días.
const OVERDUE_DAYS = 7;
// Presupuesto enviado sin respuesta hace más de 7 días.
const STALE_QUOTE_DAYS = 7;

const daysSince = (iso: string) => (Date.now() - new Date(iso).getTime()) / 86400000;

export interface QuoteSummary {
  count: number;
  billed: number; // total de aceptados (incluye pagados)
  profit: number; // ganancia de aceptados (incluye pagados)
  collected: number; // total de pagados
  toCollect: number; // aceptados todavía sin pagar
  paid: number;
  accepted: number; // aceptados + pagados
  rejected: number;
  acceptanceRate: number | null; // null si no hubo respuestas
  pendingCount: number; // enviados sin respuesta
  pendingAmount: number;
}

function summarizeQuotes(quotes: Quote[]): QuoteSummary {
  // Un presupuesto pagado también fue aceptado.
  const accepted = quotes.filter(q => q.status === 'ACCEPTED' || q.status === 'PAID');
  const paid = quotes.filter(q => q.status === 'PAID');
  const sum = (list: Quote[]) => list.reduce((a, q) => a + (q.totalPrice ?? 0), 0);
  const rejected = quotes.filter(q => q.status === 'REJECTED');
  const sent = quotes.filter(q => q.status === 'SENT');
  const answered = accepted.length + rejected.length;
  return {
    count: quotes.length,
    billed: sum(accepted),
    profit: accepted.reduce((a, q) => a + (q.totalProfit ?? 0), 0),
    collected: sum(paid),
    toCollect: sum(accepted) - sum(paid),
    paid: paid.length,
    accepted: accepted.length,
    rejected: rejected.length,
    acceptanceRate: answered > 0 ? (accepted.length / answered) * 100 : null,
    pendingCount: sent.length,
    pendingAmount: sent.reduce((a, q) => a + (q.totalPrice ?? 0), 0),
  };
}

// Estado de cada fuente: el dashboard muestra lo que haya aunque alguna falle.
type Source<T> = { data: T | null; error: boolean };
const ok = <T,>(r: PromiseSettledResult<T>): Source<T> =>
  r.status === 'fulfilled' ? { data: r.value, error: false } : { data: null, error: true };

interface RawData {
  printers: Source<PrinterResponse[]>;
  orders: Source<OrderResponse[]>;
  lowStock: Source<SparePartDTO[]>;
  quotes: Source<Quote[]>;
  prevQuotes: Source<Quote[]>;
  metrics: Source<DashboardMetricsDTO>;
  prevMetrics: Source<DashboardMetricsDTO>;
}

export function useDashboardData({ preset, period, isManager, userId }: {
  preset: PeriodPreset;
  period: Period;
  isManager: boolean;
  userId?: number;
}) {
  const [raw, setRaw] = useState<RawData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setIsLoading(true);
    const prev = previousPeriod(preset, period);
    const skip = Promise.reject(new Error('skip'));
    skip.catch(() => {});

    const results = await Promise.allSettled([
      printerService.getAllPrinters(),
      orderService.listOrders(),
      partService.listParts({ lowStock: true }),
      quoteService.list({ from: period.from, to: period.to }),
      quoteService.list({ from: prev.from, to: prev.to }),
      // Métricas globales: el endpoint es solo para MANAGER (403 para técnicos).
      isManager ? metricsService.getDashboardMetrics(period.from, period.to) : skip,
      isManager ? metricsService.getDashboardMetrics(prev.from, prev.to) : skip,
    ]);
    // Si el usuario cambió de período mientras cargaba, descartar esta respuesta.
    if (id !== requestId.current) return;

    setRaw({
      printers: ok(results[0] as PromiseSettledResult<PrinterResponse[]>),
      orders: ok(results[1] as PromiseSettledResult<OrderResponse[]>),
      lowStock: ok(results[2] as PromiseSettledResult<SparePartDTO[]>),
      quotes: ok(results[3] as PromiseSettledResult<Quote[]>),
      prevQuotes: ok(results[4] as PromiseSettledResult<Quote[]>),
      metrics: ok(results[5] as PromiseSettledResult<DashboardMetricsDTO>),
      prevMetrics: ok(results[6] as PromiseSettledResult<DashboardMetricsDTO>),
    });
    setIsLoading(false);
  }, [preset, period, isManager]);

  useEffect(() => {
    load();
  }, [load]);

  const derived = useMemo(() => {
    if (!raw) return null;
    const printers = raw.printers.data ?? [];
    const orders = raw.orders.data ?? [];
    const openOrders = orders.filter(o => OPEN_STATUSES.includes(o.status));
    const printerName = (pid: number) => {
      const p = printers.find(x => x.id === pid);
      return p ? p.name || `${p.brand} ${p.model}` : `Impresora #${pid}`;
    };

    const withDays = printers
      .map(p => ({ printer: p, days: daysUntilMaintenance(p.nextMaintenanceDate) }))
      .filter((x): x is { printer: PrinterResponse; days: number } => x.days != null);

    return {
      printers,
      printerName,
      fleet: {
        operative: printers.filter(p => p.status === 'OPERATIVE').length,
        maintenance: printers.filter(p => p.status === 'MAINTENANCE').length,
        outOfService: printers.filter(p => p.status === 'OUT_OF_SERVICE').length,
        total: printers.length,
      },
      outOfService: printers.filter(p => p.status === 'OUT_OF_SERVICE'),
      maintenanceOverdue: withDays.filter(x => x.days < 0).sort((a, b) => a.days - b.days),
      maintenanceSoon: withDays.filter(x => x.days >= 0 && x.days <= 7).sort((a, b) => a.days - b.days),
      openOrders,
      overdueOrders: openOrders
        .filter(o => daysSince(o.createdAt) > OVERDUE_DAYS)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
      myOrders: userId != null ? openOrders.filter(o => o.assignedToId === userId) : [],
      outOfStock: (raw.lowStock.data ?? []).filter(p => p.stock <= 0),
      lowStock: (raw.lowStock.data ?? []).filter(p => p.stock > 0),
      staleQuotes: (raw.quotes.data ?? []).filter(q => q.status === 'SENT' && daysSince(q.createdAt) > STALE_QUOTE_DAYS),
      quotes: raw.quotes.data ? summarizeQuotes(raw.quotes.data) : null,
      prevQuotes: raw.prevQuotes.data ? summarizeQuotes(raw.prevQuotes.data) : null,
      metrics: raw.metrics.data,
      prevMetrics: raw.prevMetrics.data,
      errors: {
        printers: raw.printers.error,
        orders: raw.orders.error,
        parts: raw.lowStock.error,
        quotes: raw.quotes.error,
        metrics: isManager && raw.metrics.error,
      },
    };
  }, [raw, userId, isManager]);

  return { data: derived, isLoading, refetch: load };
}
