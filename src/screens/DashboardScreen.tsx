// src/screens/DashboardScreen.tsx
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  CalendarClock,
  ChevronRight,
  ClipboardList,
  FileClock,
  Package,
  PackageX,
  PowerOff,
  RefreshCw,
  UserCheck,
} from 'lucide-react';
import { Button, ErrorState, ScreenHeader, Skeleton } from '../components/ui';
import { Colors } from '../constants/theme';
import { useAuth } from '../hooks/useAuth';
import { computePeriod, previousPeriod, useDashboardData } from '../hooks/useDashboardData';
import type { Period, PeriodPreset } from '../types/dashboard';
import { cx } from '../utils/cx';
import BarChart from '../components/BarChart';
import DashCard, { Unavailable } from '../components/dashboard/DashCard';
import KpiTile from '../components/dashboard/KpiTile';
import AttentionList from '../components/dashboard/AttentionList';
import type { AttentionItem } from '../components/dashboard/AttentionList';
import FleetStatus from '../components/dashboard/FleetStatus';
import styles from './DashboardScreen.module.css';

// ─── Formato ─────────────────────────────────────────────────────────────────
const money = (v: number) => `$${Math.round(v).toLocaleString('es-AR')}`;
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const shortDate = (s: string) =>
  new Date(`${s}T00:00:00`).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
const periodLabel = (p: Period) => `${shortDate(p.from)} – ${shortDate(p.to)}`;

const PRESET_LABELS: Record<PeriodPreset, string> = {
  THIS_MONTH: 'Este mes',
  LAST_3_MONTHS: '3 meses',
  THIS_YEAR: 'Este año',
};

// ─── Screen ──────────────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isManager = user?.role === 'MANAGER';

  const [preset, setPreset] = useState<PeriodPreset>('THIS_MONTH');

  const period = useMemo(() => computePeriod(preset), [preset]);
  const prevPeriod = useMemo(() => previousPeriod(preset, period), [preset, period]);

  const { data, isLoading, refetch } = useDashboardData({ preset, period, isManager, userId: user?.id });

  // ── Navegación a donde se resuelve cada cosa ──
  const go = {
    printer: (printerId: number) => navigate(`/printers/${printerId}`),
    order: (orderId: number) => navigate(`/orders/${orderId}`),
    orders: () => navigate('/orders'),
    workshop: () => navigate('/workshop'),
    stock: () => navigate('/parts'),
    quotes: () => navigate('/quotes'),
  };

  // ── "Requiere atención", ordenado por gravedad ──
  const attention: AttentionItem[] = useMemo(() => {
    if (!data) return [];
    const items: AttentionItem[] = [];
    const names = (list: { name: string | null; model: string }[]) =>
      list
        .slice(0, 2)
        .map((p) => p.name || p.model)
        .join(', ') + (list.length > 2 ? ` y ${list.length - 2} más` : '');

    if (data.overdueOrders.length > 0) {
      const oldest = data.overdueOrders[0];
      items.push({
        key: 'overdue-orders',
        Icon: ClipboardList,
        color: Colors.statusFuera,
        title: 'Órdenes vencidas',
        detail: `Abiertas hace más de 7 días · la más antigua: ${data.printerName(oldest.printerId)}`,
        count: data.overdueOrders.length,
        onPress: () => (data.overdueOrders.length === 1 ? go.order(oldest.id) : go.orders()),
      });
    }
    if (data.outOfService.length > 0) {
      items.push({
        key: 'out-of-service',
        Icon: PowerOff,
        color: Colors.statusFuera,
        title: 'Impresoras fuera de servicio',
        detail: names(data.outOfService),
        count: data.outOfService.length,
        onPress: () => (data.outOfService.length === 1 ? go.printer(data.outOfService[0].id) : go.workshop()),
      });
    }
    if (data.maintenanceOverdue.length > 0) {
      const list = data.maintenanceOverdue.map((x) => x.printer);
      items.push({
        key: 'maintenance-overdue',
        Icon: AlertTriangle,
        color: Colors.statusFuera,
        title: 'Mantenimiento vencido',
        detail: names(list),
        count: list.length,
        onPress: () => (list.length === 1 ? go.printer(list[0].id) : go.workshop()),
      });
    }
    if (data.outOfStock.length > 0) {
      items.push({
        key: 'out-of-stock',
        Icon: PackageX,
        color: Colors.statusFuera,
        title: 'Repuestos sin stock',
        detail: data.outOfStock
          .slice(0, 3)
          .map((p) => p.name)
          .join(', '),
        count: data.outOfStock.length,
        onPress: go.stock,
      });
    }
    if (!isManager && data.myOrders.length > 0) {
      items.push({
        key: 'my-orders',
        Icon: UserCheck,
        color: Colors.primary,
        title: 'Tus órdenes asignadas',
        detail: `${plural(data.myOrders.length, 'orden abierta', 'órdenes abiertas')} a tu nombre`,
        count: data.myOrders.length,
        onPress: go.orders,
      });
    }
    if (data.maintenanceSoon.length > 0) {
      const list = data.maintenanceSoon.map((x) => x.printer);
      items.push({
        key: 'maintenance-soon',
        Icon: CalendarClock,
        color: Colors.statusMantenim,
        title: 'Mantenimiento esta semana',
        detail: names(list),
        count: list.length,
        onPress: () => (list.length === 1 ? go.printer(list[0].id) : go.workshop()),
      });
    }
    if (data.lowStock.length > 0) {
      items.push({
        key: 'low-stock',
        Icon: Package,
        color: Colors.statusMantenim,
        title: 'Stock bajo',
        detail: data.lowStock
          .slice(0, 3)
          .map((p) => `${p.name} (${p.stock}/${p.minStock})`)
          .join(', '),
        count: data.lowStock.length,
        onPress: go.stock,
      });
    }
    if (data.staleQuotes.length > 0) {
      items.push({
        key: 'stale-quotes',
        Icon: FileClock,
        color: Colors.statusMantenim,
        title: 'Presupuestos sin respuesta',
        detail: `Enviados hace más de 7 días · ${money(data.staleQuotes.reduce((a, q) => a + q.totalPrice, 0))} en juego`,
        count: data.staleQuotes.length,
        onPress: go.quotes,
      });
    }
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `go` solo depende de navigate
  }, [data, isManager]);

  const allFailed = data && data.errors.printers && data.errors.orders && data.errors.quotes;

  return (
    <>
      <ScreenHeader
        title="Dashboard"
        rightContent={
          <Button
            title="Actualizar"
            variant="tinted"
            size="sm"
            fullWidth={false}
            icon={<RefreshCw size={16} aria-hidden="true" />}
            loading={isLoading && !!data}
            onPress={refetch}
          />
        }
      />

      {/* Selector de período */}
      <div className={styles.periodBar}>
        <div className={styles.segmented} role="group" aria-label="Período">
          {(Object.keys(PRESET_LABELS) as PeriodPreset[]).map((p) => (
            <button
              key={p}
              type="button"
              className={cx(styles.segment, preset === p && styles.segmentSelected)}
              aria-pressed={preset === p}
              onClick={() => setPreset(p)}
            >
              {PRESET_LABELS[p]}
            </button>
          ))}
        </div>
        <p className={styles.periodCaption}>
          {periodLabel(period)} · comparado con {periodLabel(prevPeriod)}
        </p>
      </div>

      {isLoading && !data ? (
        <div className={styles.grid} aria-busy="true">
          <Skeleton height={180} className={styles.skeleton} />
          <Skeleton height={140} className={styles.skeleton} />
          <Skeleton height={200} className={styles.skeleton} />
        </div>
      ) : allFailed ? (
        <ErrorState error="No se pudo cargar el dashboard. Revisá tu conexión." onRetry={refetch} />
      ) : data ? (
        <div className={styles.grid}>
          {/* 1 — Qué hay que hacer */}
          <DashCard
            title="Requiere atención"
            subtitle={attention.length > 0 ? plural(attention.length, 'tema pendiente', 'temas pendientes') : undefined}
          >
            <AttentionList items={attention} />
          </DashCard>

          {/* 2 — Estado actual del taller */}
          <DashCard title="Estado del taller" subtitle="En este momento" actionLabel="Ver taller" onAction={go.workshop}>
            {data.errors.printers ? (
              <Unavailable />
            ) : (
              <>
                <FleetStatus {...data.fleet} />
                <div className={styles.inlineStats}>
                  <InlineStat label="Órdenes abiertas" value={String(data.openOrders.length)} onPress={go.orders} />
                  <InlineStat
                    label="Mant. próximos 7 días"
                    value={String(data.maintenanceSoon.length)}
                    onPress={go.workshop}
                  />
                </div>
              </>
            )}
          </DashCard>

          {/* 3 — Negocio */}
          <DashCard
            title="Presupuestos"
            subtitle={periodLabel(period)}
            actionLabel="Ver todos"
            onAction={go.quotes}
            className={styles.wide}
          >
            {!data.quotes ? (
              <Unavailable />
            ) : data.quotes.count === 0 ? (
              <p className={styles.emptyText}>No se crearon presupuestos en este período.</p>
            ) : (
              <>
                <div className={styles.kpiGrid}>
                  <KpiTile
                    label="Facturado"
                    value={money(data.quotes.billed)}
                    current={data.quotes.billed}
                    previous={data.prevQuotes?.billed}
                    hint={plural(data.quotes.accepted, 'aceptado', 'aceptados')}
                  />
                  <KpiTile
                    label="Ganancia"
                    value={money(data.quotes.profit)}
                    current={data.quotes.profit}
                    previous={data.prevQuotes?.profit}
                  />
                  <KpiTile
                    label="Tasa de aceptación"
                    value={data.quotes.acceptanceRate != null ? `${data.quotes.acceptanceRate.toFixed(0)}%` : '—'}
                    current={data.quotes.acceptanceRate}
                    previous={data.prevQuotes?.acceptanceRate}
                    deltaInPoints
                    hint="Sin respuestas todavía"
                  />
                  <KpiTile
                    label="Esperando respuesta"
                    value={money(data.quotes.pendingAmount)}
                    hint={plural(data.quotes.pendingCount, 'presupuesto enviado', 'presupuestos enviados')}
                  />
                  <KpiTile
                    label="Cobrado"
                    value={money(data.quotes.collected)}
                    current={data.quotes.collected}
                    previous={data.prevQuotes?.collected}
                    hint={plural(data.quotes.paid, 'pagado', 'pagados')}
                  />
                  <KpiTile
                    label="Por cobrar"
                    value={money(data.quotes.toCollect)}
                    hint="Aceptados sin pagar"
                    tone={data.quotes.toCollect > 0 ? 'danger' : 'default'}
                  />
                </div>
                <FunnelBar
                  total={data.quotes.count}
                  paid={data.quotes.paid}
                  accepted={data.quotes.accepted - data.quotes.paid}
                  pending={data.quotes.pendingCount}
                  rejected={data.quotes.rejected}
                />
              </>
            )}
          </DashCard>

          {/* 4 — Mantenimiento (solo administradores: usa /api/metrics, 403 para técnicos) */}
          {isManager && (
            <DashCard
              title="Mantenimiento"
              subtitle={periodLabel(period)}
              actionLabel="Órdenes"
              onAction={go.orders}
              className={styles.wide}
            >
              {!data.metrics ? (
                <Unavailable />
              ) : (
                <>
                  <div className={styles.kpiGrid}>
                    <KpiTile
                      label="Disponibilidad"
                      value={`${data.metrics.globalAvailabilityPercent.toFixed(1)}%`}
                      current={data.metrics.globalAvailabilityPercent}
                      previous={data.prevMetrics?.globalAvailabilityPercent}
                      deltaInPoints
                    />
                    <KpiTile
                      label="Costo"
                      value={money(data.metrics.totalCost)}
                      current={data.metrics.totalCost}
                      previous={data.prevMetrics?.totalCost}
                      invert
                    />
                    <KpiTile
                      label="Resolución promedio"
                      value={`${data.metrics.avgResolutionHours.toFixed(1)} h`}
                      current={data.metrics.avgResolutionHours || null}
                      previous={data.prevMetrics?.avgResolutionHours || null}
                      invert
                      hint="Sin órdenes cerradas"
                    />
                    <KpiTile
                      label="Órdenes del período"
                      value={String(data.metrics.totalOrders)}
                      hint={`${data.metrics.closedOrders} cerradas · ${data.metrics.openOrders} abiertas`}
                    />
                  </div>

                  {/* Resultado neto: lo que dejó el negocio menos lo que costó mantener */}
                  {data.quotes && <NetResult profit={data.quotes.profit} maintenanceCost={data.metrics.totalCost} />}

                  <TypeMix
                    preventive={data.metrics.byType.preventive}
                    corrective={data.metrics.byType.corrective}
                    calibration={data.metrics.byType.calibration}
                  />

                  {data.metrics.costByMonth.length > 1 && (
                    <div className={styles.chartBlock}>
                      <h3 className={styles.blockTitle}>Costo por mes</h3>
                      <BarChart data={data.metrics.costByMonth} />
                    </div>
                  )}
                </>
              )}
            </DashCard>
          )}

          {/* 5 — Impresoras problemáticas (solo administradores) */}
          {isManager && data.metrics && (
            <ProblemPrinters
              failing={data.metrics.top3FailingPrinters}
              availability={data.metrics.availabilityByPrinter}
              onPress={go.printer}
            />
          )}
        </div>
      ) : null}
    </>
  );
}

// ─── Bloques auxiliares ──────────────────────────────────────────────────────
function InlineStat({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return (
    <button type="button" className={styles.inlineStat} onClick={onPress}>
      <span className={styles.inlineValue}>{value}</span>
      <span className={styles.inlineLabel}>{label}</span>
    </button>
  );
}

function Legend({ parts }: { parts: { label: string; value: number; color: string }[] }) {
  return (
    <ul className={styles.legend}>
      {parts.map((p) => (
        <li key={p.label} className={styles.legendText}>
          <span className={styles.legendDot} style={{ color: p.color }} aria-hidden="true">
            ●
          </span>{' '}
          {p.value} {p.label.toLowerCase()}
        </li>
      ))}
    </ul>
  );
}

function StackBar({ parts }: { parts: { label: string; value: number; color: string }[] }) {
  return (
    <div className={styles.stackBar} aria-hidden="true">
      {parts
        .filter((p) => p.value > 0)
        .map((p) => (
          <span key={p.label} style={{ flex: p.value, background: p.color }} />
        ))}
    </div>
  );
}

// Embudo de presupuestos del período: aceptados / esperando / rechazados / borradores.
function FunnelBar({ total, paid, accepted, pending, rejected }: { total: number; paid: number; accepted: number; pending: number; rejected: number }) {
  const drafts = Math.max(0, total - paid - accepted - pending - rejected);
  const parts = [
    { label: 'Pagados', value: paid, color: 'var(--color-success-text)' },
    { label: 'Aceptados', value: accepted, color: 'var(--color-status-operativa)' },
    { label: 'Enviados', value: pending, color: 'var(--color-primary)' },
    { label: 'Rechazados', value: rejected, color: 'var(--color-status-fuera)' },
    { label: 'Borradores', value: drafts, color: 'var(--color-text-tertiary)' },
  ];
  return (
    <div className={styles.funnel}>
      <StackBar parts={parts} />
      <Legend parts={parts} />
    </div>
  );
}

function NetResult({ profit, maintenanceCost }: { profit: number; maintenanceCost: number }) {
  const net = profit - maintenanceCost;
  const positive = net >= 0;
  return (
    <div className={cx(styles.netBox, positive ? styles.netPositive : styles.netNegative)}>
      <div className={styles.netTexts}>
        <p className={styles.netLabel}>Resultado neto</p>
        <p className={styles.netFormula}>
          Ganancia de presupuestos {money(profit)} − mantenimiento {money(maintenanceCost)}
        </p>
      </div>
      <p className={styles.netValue}>
        {positive ? '' : '−'}
        {money(Math.abs(net))}
      </p>
    </div>
  );
}

// Proporción preventivo vs. correctivo: mucho correctivo = se está apagando incendios.
function TypeMix({ preventive, corrective, calibration }: { preventive: number; corrective: number; calibration: number }) {
  const total = preventive + corrective + calibration;
  if (total === 0) return null;
  const correctivePct = Math.round((corrective / total) * 100);
  const parts = [
    { label: 'Preventivo', value: preventive, color: 'var(--color-status-operativa)' },
    { label: 'Calibración', value: calibration, color: 'var(--color-primary)' },
    { label: 'Correctivo', value: corrective, color: 'var(--color-status-fuera)' },
  ];
  return (
    <div className={styles.chartBlock}>
      <h3 className={styles.blockTitle}>Tipo de órdenes</h3>
      <StackBar parts={parts} />
      <Legend parts={parts} />
      {correctivePct >= 50 && (
        <p className={styles.insight}>
          El {correctivePct}% de las órdenes fueron correctivas: conviene reforzar el mantenimiento preventivo.
        </p>
      )}
    </div>
  );
}

function ProblemPrinters({
  failing,
  availability,
  onPress,
}: {
  failing: { id: number; name: string; correctiveCount: number; totalCost: number }[];
  availability: { id: number; name: string; availabilityPercent: number }[];
  onPress: (id: number) => void;
}) {
  const lowAvailability = [...availability]
    .filter((p) => p.availabilityPercent < 90)
    .sort((a, b) => a.availabilityPercent - b.availabilityPercent)
    .slice(0, 3);

  if (failing.length === 0 && lowAvailability.length === 0) return null;

  return (
    <DashCard title="Impresoras a revisar" subtitle="Más fallas y menor disponibilidad del período" className={styles.wide}>
      <ul>
        {failing.map((f) => (
          <li key={`f-${f.id}`}>
            <button type="button" className={styles.problemRow} onClick={() => onPress(f.id)}>
              <span className={styles.problemDot} style={{ background: 'var(--color-status-fuera)' }} aria-hidden="true" />
              <span className={styles.problemTexts}>
                <span className={styles.problemName}>{f.name}</span>
                <span className={styles.problemDetail}>
                  {plural(f.correctiveCount, 'falla', 'fallas')} · {money(f.totalCost)} en reparaciones
                </span>
              </span>
              <ChevronRight size={18} className={styles.chevron} aria-hidden="true" />
            </button>
          </li>
        ))}
        {lowAvailability
          .filter((p) => !failing.some((f) => f.id === p.id))
          .map((p) => (
            <li key={`a-${p.id}`}>
              <button type="button" className={styles.problemRow} onClick={() => onPress(p.id)}>
                <span className={styles.problemDot} style={{ background: 'var(--color-status-mantenim)' }} aria-hidden="true" />
                <span className={styles.problemTexts}>
                  <span className={styles.problemName}>{p.name}</span>
                  <span className={styles.problemDetail}>Disponibilidad {p.availabilityPercent.toFixed(0)}%</span>
                </span>
                <ChevronRight size={18} className={styles.chevron} aria-hidden="true" />
              </button>
            </li>
          ))}
      </ul>
    </DashCard>
  );
}
