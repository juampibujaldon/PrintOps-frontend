// src/screens/DashboardScreen.tsx
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Platform,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import {
  AlertTriangle,
  CalendarClock,
  ClipboardList,
  FileClock,
  PackageX,
  Package,
  PowerOff,
  UserCheck,
  ChevronRight,
} from 'lucide-react-native';
import { Colors, Radius, Spacing, Typography } from '../constants/theme';
import { useAuth } from '../hooks/useAuth';
import { computePeriod, isoDate, previousPeriod, useDashboardData } from '../hooks/useDashboardData';
import { Period, PeriodPreset } from '../types/dashboard';
import BarChart from '../components/BarChart';
import Skeleton from '../components/ui/Skeleton';
import ErrorState from '../components/ui/ErrorState';
import DashCard, { Unavailable } from '../components/dashboard/DashCard';
import KpiTile from '../components/dashboard/KpiTile';
import AttentionList, { AttentionItem } from '../components/dashboard/AttentionList';
import FleetStatus from '../components/dashboard/FleetStatus';

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
  CUSTOM: 'Personalizado',
};

// ─── Screen ──────────────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const isManager = user?.role === 'MANAGER';

  const [preset, setPreset] = useState<PeriodPreset>('THIS_MONTH');
  const [customPeriod, setCustomPeriod] = useState<Period>(() => computePeriod('THIS_MONTH'));
  const [picker, setPicker] = useState<'from' | 'to' | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const period = useMemo(
    () => (preset === 'CUSTOM' ? customPeriod : computePeriod(preset)),
    [preset, customPeriod],
  );
  const prevPeriod = useMemo(() => previousPeriod(preset, period), [preset, period]);

  const { data, isLoading, refetch } = useDashboardData({ preset, period, isManager, userId: user?.id });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handlePickerChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (date && picker) {
      setCustomPeriod(prev => {
        const next = { ...prev, [picker]: isoDate(date) };
        // Mantener desde <= hasta.
        return next.from > next.to ? { from: next.to, to: next.from } : next;
      });
    }
    if (Platform.OS === 'android') setPicker(null);
  };

  // ── Navegación a donde se resuelve cada cosa ──
  const go = {
    printer: (printerId: number) => navigation.navigate('InicioStack', { screen: 'PrinterDetail', params: { printerId } }),
    order: (orderId: number) => navigation.navigate('InicioStack', { screen: 'OrderDetail', params: { orderId } }),
    orders: () => navigation.navigate('InicioStack', { screen: 'OrdersList' }),
    workshop: () => navigation.navigate('Taller'),
    stock: () => navigation.navigate('Repuestos'),
    quotes: () => navigation.navigate('Presupuestos'),
  };

  // ── "Requiere atención", ordenado por gravedad ──
  const attention: AttentionItem[] = useMemo(() => {
    if (!data) return [];
    const items: AttentionItem[] = [];
    const names = (list: { name: string | null; model: string }[]) =>
      list.slice(0, 2).map(p => p.name || p.model).join(', ') + (list.length > 2 ? ` y ${list.length - 2} más` : '');

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
      const list = data.maintenanceOverdue.map(x => x.printer);
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
        detail: data.outOfStock.slice(0, 3).map(p => p.name).join(', '),
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
      const list = data.maintenanceSoon.map(x => x.printer);
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
        detail: data.lowStock.slice(0, 3).map(p => `${p.name} (${p.stock}/${p.minStock})`).join(', '),
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, isManager]);

  const allFailed = data && data.errors.printers && data.errors.orders && data.errors.quotes;

  return (
    <View style={styles.root}>
      {/* Selector de período (fijo arriba) */}
      <View style={styles.periodBar}>
        <View style={styles.segmented}>
          {(Object.keys(PRESET_LABELS) as PeriodPreset[]).map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.segment, preset === p && styles.segmentSelected]}
              onPress={() => setPreset(p)}
              accessibilityRole="button"
              accessibilityState={{ selected: preset === p }}
            >
              <Text style={[styles.segmentText, preset === p && styles.segmentTextSelected]} numberOfLines={1}>
                {PRESET_LABELS[p]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {preset === 'CUSTOM' && (
          <View style={styles.customRow}>
            {(['from', 'to'] as const).map(field => (
              <TouchableOpacity
                key={field}
                style={[styles.dateBtn, picker === field && styles.dateBtnActive]}
                onPress={() => setPicker(pk => (pk === field ? null : field))}
              >
                <Text style={styles.dateLabel}>{field === 'from' ? 'Desde' : 'Hasta'}</Text>
                <Text style={styles.dateValue}>{shortDate(customPeriod[field])}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {picker && (
          <DateTimePicker
            value={new Date(`${customPeriod[picker]}T00:00:00`)}
            mode="date"
            maximumDate={new Date()}
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={handlePickerChange}
          />
        )}

        <Text style={styles.periodCaption}>
          {periodLabel(period)} · comparado con {periodLabel(prevPeriod)}
        </Text>
      </View>

      {isLoading && !data ? (
        <ScrollView contentContainerStyle={styles.content}>
          <Skeleton style={[styles.skeleton, { height: 180 }]} />
          <Skeleton style={[styles.skeleton, { height: 140 }]} />
          <Skeleton style={[styles.skeleton, { height: 200 }]} />
        </ScrollView>
      ) : allFailed ? (
        <ErrorState error="No se pudo cargar el dashboard. Revisá tu conexión." onRetry={refetch} />
      ) : data ? (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          showsVerticalScrollIndicator={false}
        >
          {/* 1 — Qué hay que hacer */}
          <DashCard
            title="Requiere atención"
            subtitle={attention.length > 0 ? `${plural(attention.length, 'tema pendiente', 'temas pendientes')}` : undefined}
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
                <View style={styles.inlineStats}>
                  <InlineStat label="Órdenes abiertas" value={String(data.openOrders.length)} onPress={go.orders} />
                  <InlineStat
                    label="Mant. próximos 7 días"
                    value={String(data.maintenanceSoon.length)}
                    onPress={go.workshop}
                  />
                </View>
              </>
            )}
          </DashCard>

          {/* 3 — Negocio */}
          <DashCard title="Presupuestos" subtitle={periodLabel(period)} actionLabel="Ver todos" onAction={go.quotes}>
            {!data.quotes ? (
              <Unavailable />
            ) : data.quotes.count === 0 ? (
              <Text style={styles.emptyText}>No se crearon presupuestos en este período.</Text>
            ) : (
              <>
                <View style={styles.kpiGrid}>
                  <KpiTile
                    label="Facturado"
                    value={money(data.quotes.billed)}
                    current={data.quotes.billed}
                    previous={data.prevQuotes?.billed}
                    hint={`${plural(data.quotes.accepted, 'aceptado', 'aceptados')}`}
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
                </View>
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

          {/* 4 — Mantenimiento (solo administradores: usa /api/metrics) */}
          {isManager && (
            <DashCard title="Mantenimiento" subtitle={periodLabel(period)} actionLabel="Órdenes" onAction={go.orders}>
              {!data.metrics ? (
                <Unavailable />
              ) : (
                <>
                  <View style={styles.kpiGrid}>
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
                  </View>

                  {/* Resultado neto: lo que dejó el negocio menos lo que costó mantener */}
                  {data.quotes && (
                    <NetResult profit={data.quotes.profit} maintenanceCost={data.metrics.totalCost} />
                  )}

                  <TypeMix
                    preventive={data.metrics.byType.preventive}
                    corrective={data.metrics.byType.corrective}
                    calibration={data.metrics.byType.calibration}
                  />

                  {data.metrics.costByMonth.length > 1 && (
                    <View style={styles.chartBlock}>
                      <Text style={styles.blockTitle}>Costo por mes</Text>
                      <BarChart data={data.metrics.costByMonth} />
                    </View>
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
        </ScrollView>
      ) : null}
    </View>
  );
}

// ─── Bloques auxiliares ──────────────────────────────────────────────────────
function InlineStat({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.inlineStat} onPress={onPress} accessibilityRole="button">
      <Text style={styles.inlineValue}>{value}</Text>
      <Text style={styles.inlineLabel} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
}

// Embudo de presupuestos del período: aceptados / esperando / rechazados / borradores.
function FunnelBar({ total, paid, accepted, pending, rejected }: { total: number; paid: number; accepted: number; pending: number; rejected: number }) {
  const drafts = Math.max(0, total - paid - accepted - pending - rejected);
  const parts = [
    { label: 'Pagados', value: paid, color: Colors.successText },
    { label: 'Aceptados', value: accepted, color: Colors.statusOperativa },
    { label: 'Enviados', value: pending, color: Colors.primary },
    { label: 'Rechazados', value: rejected, color: Colors.statusFuera },
    { label: 'Borradores', value: drafts, color: Colors.textTertiary },
  ];
  return (
    <View style={styles.funnel}>
      <View style={styles.stackBar}>
        {parts.filter(p => p.value > 0).map(p => (
          <View key={p.label} style={{ flex: p.value, backgroundColor: p.color }} />
        ))}
      </View>
      <View style={styles.legend}>
        {parts.map(p => (
          <Text key={p.label} style={styles.legendText}>
            <Text style={{ color: p.color, fontWeight: '700' }}>●</Text> {p.value} {p.label.toLowerCase()}
          </Text>
        ))}
      </View>
    </View>
  );
}

function NetResult({ profit, maintenanceCost }: { profit: number; maintenanceCost: number }) {
  const net = profit - maintenanceCost;
  const positive = net >= 0;
  return (
    <View style={[styles.netBox, { backgroundColor: positive ? Colors.successBg : Colors.errorBg }]}>
      <View style={styles.flex}>
        <Text style={styles.netLabel}>Resultado neto</Text>
        <Text style={styles.netFormula}>
          Ganancia de presupuestos {money(profit)} − mantenimiento {money(maintenanceCost)}
        </Text>
      </View>
      <Text style={[styles.netValue, { color: positive ? Colors.successText : Colors.errorText }]}>
        {positive ? '' : '−'}{money(Math.abs(net))}
      </Text>
    </View>
  );
}

// Proporción preventivo vs. correctivo: mucho correctivo = se está apagando incendios.
function TypeMix({ preventive, corrective, calibration }: { preventive: number; corrective: number; calibration: number }) {
  const total = preventive + corrective + calibration;
  if (total === 0) return null;
  const correctivePct = Math.round((corrective / total) * 100);
  const parts = [
    { label: 'Preventivo', value: preventive, color: Colors.statusOperativa },
    { label: 'Calibración', value: calibration, color: Colors.primary },
    { label: 'Correctivo', value: corrective, color: Colors.statusFuera },
  ];
  return (
    <View style={styles.chartBlock}>
      <Text style={styles.blockTitle}>Tipo de órdenes</Text>
      <View style={styles.stackBar}>
        {parts.filter(p => p.value > 0).map(p => (
          <View key={p.label} style={{ flex: p.value, backgroundColor: p.color }} />
        ))}
      </View>
      <View style={styles.legend}>
        {parts.map(p => (
          <Text key={p.label} style={styles.legendText}>
            <Text style={{ color: p.color, fontWeight: '700' }}>●</Text> {p.value} {p.label.toLowerCase()}
          </Text>
        ))}
      </View>
      {correctivePct >= 50 && (
        <Text style={styles.insight}>
          El {correctivePct}% de las órdenes fueron correctivas: conviene reforzar el mantenimiento preventivo.
        </Text>
      )}
    </View>
  );
}

function ProblemPrinters({ failing, availability, onPress }: {
  failing: { id: number; name: string; correctiveCount: number; totalCost: number }[];
  availability: { id: number; name: string; availabilityPercent: number }[];
  onPress: (id: number) => void;
}) {
  const lowAvailability = [...availability]
    .filter(p => p.availabilityPercent < 90)
    .sort((a, b) => a.availabilityPercent - b.availabilityPercent)
    .slice(0, 3);

  if (failing.length === 0 && lowAvailability.length === 0) return null;

  return (
    <DashCard title="Impresoras a revisar" subtitle="Más fallas y menor disponibilidad del período">
      {failing.map(f => (
        <TouchableOpacity key={`f-${f.id}`} style={styles.problemRow} onPress={() => onPress(f.id)}>
          <View style={[styles.problemDot, { backgroundColor: Colors.statusFuera }]} />
          <View style={styles.flex}>
            <Text style={styles.problemName} numberOfLines={1}>{f.name}</Text>
            <Text style={styles.problemDetail}>
              {plural(f.correctiveCount, 'falla', 'fallas')} · {money(f.totalCost)} en reparaciones
            </Text>
          </View>
          <ChevronRight color={Colors.textTertiary} size={18} />
        </TouchableOpacity>
      ))}
      {lowAvailability
        .filter(p => !failing.some(f => f.id === p.id))
        .map(p => (
          <TouchableOpacity key={`a-${p.id}`} style={styles.problemRow} onPress={() => onPress(p.id)}>
            <View style={[styles.problemDot, { backgroundColor: Colors.statusMantenim }]} />
            <View style={styles.flex}>
              <Text style={styles.problemName} numberOfLines={1}>{p.name}</Text>
              <Text style={styles.problemDetail}>Disponibilidad {p.availabilityPercent.toFixed(0)}%</Text>
            </View>
            <ChevronRight color={Colors.textTertiary} size={18} />
          </TouchableOpacity>
        ))}
    </DashCard>
  );
}

// ─── Estilos ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: { flex: 1, backgroundColor: Colors.background },

  periodBar: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.separator,
    backgroundColor: Colors.background,
  },
  segmented: { flexDirection: 'row', backgroundColor: Colors.fill, borderRadius: 9, padding: 2 },
  segment: { flex: 1, paddingVertical: 7, borderRadius: 7, alignItems: 'center' },
  segmentSelected: {
    backgroundColor: Colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentText: { ...Typography.footnote, color: Colors.textPrimary, fontWeight: '500' },
  segmentTextSelected: { fontWeight: '600' },
  customRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  dateBtn: { flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: 8, borderWidth: 1.5, borderColor: 'transparent' },
  dateBtnActive: { borderColor: Colors.primary },
  dateLabel: { ...Typography.caption2, color: Colors.textTertiary, textTransform: 'uppercase' },
  dateValue: { ...Typography.subheadline, fontWeight: '600', color: Colors.textPrimary },
  periodCaption: { ...Typography.caption, color: Colors.textTertiary, marginTop: Spacing.sm, textAlign: 'center' },

  content: { padding: Spacing.lg, paddingBottom: 48 },
  skeleton: { borderRadius: Radius.lg, marginBottom: Spacing.md },
  emptyText: { ...Typography.footnote, color: Colors.textSecondary },

  inlineStats: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  inlineStat: { flex: 1, backgroundColor: Colors.background, borderRadius: Radius.md, padding: Spacing.md },
  inlineValue: { ...Typography.title3, ...Typography.tabular, color: Colors.textPrimary },
  inlineLabel: { ...Typography.footnote, color: Colors.textSecondary, marginTop: 2 },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },

  funnel: { marginTop: Spacing.lg },
  stackBar: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', gap: 2, backgroundColor: Colors.fill },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: Spacing.md, rowGap: 4, marginTop: Spacing.sm },
  legendText: { ...Typography.caption, color: Colors.textSecondary },

  netBox: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderRadius: Radius.md, padding: Spacing.md, marginTop: Spacing.md },
  netLabel: { ...Typography.subheadline, fontWeight: '600', color: Colors.textPrimary },
  netFormula: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  netValue: { ...Typography.title3, ...Typography.tabular },

  chartBlock: { marginTop: Spacing.lg },
  blockTitle: { ...Typography.footnote, fontWeight: '600', color: Colors.textSecondary, marginBottom: Spacing.sm, textTransform: 'uppercase' },
  insight: { ...Typography.footnote, color: Colors.warningText, marginTop: Spacing.sm },

  problemRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm },
  problemDot: { width: 8, height: 8, borderRadius: 4 },
  problemName: { ...Typography.subheadline, fontWeight: '600', color: Colors.textPrimary },
  problemDetail: { ...Typography.footnote, color: Colors.textSecondary, marginTop: 1 },
});
