// src/screens/DashboardScreen.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  LayoutAnimation,
  Platform,
  UIManager,
  Animated,
  DimensionValue,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import { Colors, Radius, Spacing, Typography } from '../constants/theme';
import { useDashboardMetrics } from '../hooks/useDashboardMetrics';
import BarChart from '../components/BarChart';
import { DashboardMetricsDTO, Period, PeriodPreset } from '../types/dashboard';
import { AlertTriangle, CheckCircle2, ChevronDown } from 'lucide-react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function moneyTotal(v: number): string {
  return `$${v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function moneyInt(v: number): string {
  return `$${v.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;
}
function availabilityColor(v: number): string {
  if (v >= 90) return Colors.statusOperativa;
  if (v >= 70) return Colors.statusMantenim;
  return Colors.statusFuera;
}
// Fecha local YYYY-MM-DD. toISOString() usa UTC y, en Argentina después de las
// 21 h, devolvía el día siguiente.
function iso(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}
function computePeriod(p: PeriodPreset): Period {
  const now = new Date();
  switch (p) {
    case 'THIS_MONTH':
      return { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: iso(now) };
    case 'LAST_3_MONTHS':
      return { from: iso(new Date(now.getFullYear(), now.getMonth() - 2, 1)), to: iso(now) };
    case 'THIS_YEAR':
      return { from: iso(new Date(now.getFullYear(), 0, 1)), to: iso(now) };
    case 'CUSTOM':
      return { from: iso(now), to: iso(now) };
  }
}

// ─── Componentes auxiliares ──────────────────────────────────────────────────
function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.create(260, 'easeInEaseOut', 'opacity'));
    setOpen(o => !o);
  };
  return (
    <View style={styles.section}>
      <TouchableOpacity style={styles.sectionHeader} onPress={toggle} activeOpacity={0.8}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <ChevronDown
          color={Colors.textTertiary}
          size={18}
          style={{ transform: [{ rotate: open ? '0deg' : '-90deg' }] }}
        />
      </TouchableOpacity>
      {open ? children : null}
    </View>
  );
}

function SkeletonBlock({ height = 16, width = '100%' }: { height?: number; width?: DimensionValue }) {
  const opacity = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return <Animated.View style={[styles.skeleton, { height, width, opacity }]} />;
}

// ─── Screen ──────────────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const { metrics, isLoading, error, refetch, period, setPeriod } = useDashboardMetrics();
  const [preset, setPreset] = useState<PeriodPreset>('THIS_MONTH');
  const [picker, setPicker] = useState<'from' | 'to' | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const applyPreset = (p: PeriodPreset) => {
    setPreset(p);
    setPeriod(computePeriod(p));
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handlePickerChange = (event: DateTimePickerEvent, date?: Date) => {
    if (date && picker) {
      const field = picker;
      setPeriod({ ...period, [field]: iso(date) });
    }
    if (Platform.OS === 'android') setPicker(null);
  };

  const goToHistory = (printerId: number) => {
    navigation.navigate('InicioStack', { screen: 'PrinterHistory', params: { printer: { id: printerId } } });
  };

  const showSkeleton = isLoading && !metrics;

  return (
    <View style={styles.root}>
      {/* Selector de período (sticky) */}
      <View style={styles.periodBar}>
        <View style={styles.chipRow}>
          {(['THIS_MONTH', 'LAST_3_MONTHS', 'THIS_YEAR', 'CUSTOM'] as PeriodPreset[]).map(p => {
            const labels: Record<PeriodPreset, string> = {
              THIS_MONTH: 'Este mes',
              LAST_3_MONTHS: '3 meses',
              THIS_YEAR: 'Este año',
              CUSTOM: 'Personalizado',
            };
            return (
              <TouchableOpacity
                key={p}
                style={[styles.chip, preset === p && styles.chipSelected]}
                onPress={() => applyPreset(p)}
              >
                <Text style={[styles.chipText, preset === p && styles.chipTextSelected]}>{labels[p]}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {preset === 'CUSTOM' ? (
          <View style={styles.customRow}>
            <TouchableOpacity style={styles.dateBtn} onPress={() => setPicker(pk => (pk === 'from' ? null : 'from'))}>
              <Text style={styles.dateLabel}>Desde</Text>
              <Text style={styles.dateValue}>{period.from}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dateBtn} onPress={() => setPicker(pk => (pk === 'to' ? null : 'to'))}>
              <Text style={styles.dateLabel}>Hasta</Text>
              <Text style={styles.dateValue}>{period.to}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {picker ? (
          <DateTimePicker
            value={(picker === 'from' ? period.from : period.to) ? new Date(`${picker === 'from' ? period.from : period.to}T00:00:00`) : new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handlePickerChange}
          />
        ) : null}
      </View>

      {showSkeleton ? (
        <ScrollView contentContainerStyle={styles.content}>
          <SkeletonBlock height={160} />
          <SkeletonBlock height={180} />
          <SkeletonBlock height={140} />
          <SkeletonBlock height={120} />
        </ScrollView>
      ) : error && !metrics ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={refetch}>
            <Text style={styles.primaryBtnText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          {metrics && metrics.totalOrders === 0 ? (
            <View style={styles.noData}>
              <Text style={styles.noDataText}>No hay actividad registrada en este período</Text>
            </View>
          ) : null}

          <DashboardContent metrics={metrics} onPressPrinter={goToHistory} />
        </ScrollView>
      )}
    </View>
  );
}

// ─── Contenido del dashboard ─────────────────────────────────────────────────
function DashboardContent({
  metrics,
  onPressPrinter,
}: {
  metrics: DashboardMetricsDTO | null;
  onPressPrinter: (id: number) => void;
}) {
  if (!metrics) return null;

  return (
    <>
      {/* Sección 1 — Disponibilidad */}
      <Section title="Disponibilidad global">
        <Text style={styles.bigNumber}>{metrics.globalAvailabilityPercent.toFixed(1)}%</Text>
        <View style={styles.globalTrack}>
          <View style={[styles.globalFill, { width: `${Math.min(100, metrics.globalAvailabilityPercent)}%`, backgroundColor: availabilityColor(metrics.globalAvailabilityPercent) }]} />
        </View>

        {metrics.availabilityByPrinter.map(p => (
          <View key={p.id} style={styles.availRow}>
            <Text style={styles.availName} numberOfLines={1}>{p.name}</Text>
            <View style={styles.availTrack}>
              <View style={[styles.availFill, { width: `${Math.min(100, p.availabilityPercent)}%`, backgroundColor: availabilityColor(p.availabilityPercent) }]} />
            </View>
            <Text style={styles.availPct}>{p.availabilityPercent.toFixed(0)}%</Text>
            {p.availabilityPercent >= 70
              ? <CheckCircle2 color={Colors.green} size={16} />
              : <AlertTriangle color={Colors.orange} size={16} />}
          </View>
        ))}
      </Section>

      {/* Sección 2 — Costos */}
      <Section title="Costos">
        <Text style={styles.bigNumber}>{moneyTotal(metrics.totalCost)}</Text>
        <View style={styles.costSplit}>
          <Text style={styles.costSplitText}>Piezas: {moneyInt(metrics.totalPartsCost)}</Text>
          <Text style={styles.costSplitText}>Mano de obra: {moneyInt(metrics.totalLaborCost)}</Text>
        </View>
        <BarChart data={metrics.costByMonth} />
      </Section>

      {/* Sección 3 — Órdenes */}
      <Section title="Órdenes">
        <View style={styles.ordersSummary}>
          <Text style={styles.ordersCount}>{metrics.totalOrders} órdenes</Text>
          <Text style={styles.ordersAvg}>Tiempo prom: {metrics.avgResolutionHours.toFixed(1)}hs</Text>
        </View>
        <View style={styles.statRow}>
          <StatCard label="Abiertas" value={metrics.openOrders} color={Colors.textSecondary} />
          <StatCard label="Cerradas" value={metrics.closedOrders} color={Colors.statusOperativa} />
          <StatCard label="Vencidas" value={metrics.overdueOrders} color={Colors.statusFuera} danger={metrics.overdueOrders > 0} />
        </View>
        <Text style={styles.typeBreakdown}>
          Prev: {metrics.byType.preventive}  Corr: {metrics.byType.corrective}  Cal: {metrics.byType.calibration}
        </Text>
      </Section>

      {/* Sección 4 — Top 3 fallas */}
      <Section title="Top impresoras con más fallas">
        {metrics.top3FailingPrinters.length === 0 ? (
          <Text style={styles.emptyText}>Sin fallas correctivas en el período</Text>
        ) : (
          metrics.top3FailingPrinters.map((f, i) => {
            const dots = [Colors.red, Colors.orange, Colors.gray];
            return (
              <TouchableOpacity key={f.id} style={styles.failingRow} onPress={() => onPressPrinter(f.id)}>
                <View style={[styles.failingDotView, { backgroundColor: dots[i] ?? Colors.gray }]} />
                <Text style={styles.failingName} numberOfLines={1}>{f.name}</Text>
                <Text style={styles.failingCount}>{f.correctiveCount} fallas</Text>
                <Text style={styles.failingCost}>{moneyInt(f.totalCost)}</Text>
              </TouchableOpacity>
            );
          })
        )}
      </Section>

      {/* Sección 5 — Stock bajo */}
      <Section title="Stock bajo">
        {metrics.lowStockParts.length === 0 ? (
          <Text style={styles.stockOk}>Todos los repuestos en nivel normal</Text>
        ) : (
          <>
            <Text style={styles.stockWarn}>{metrics.lowStockParts.length} repuestos con stock bajo</Text>
            {metrics.lowStockParts.map(p => (
              <View key={p.id} style={styles.stockRow}>
                <Text style={styles.stockName} numberOfLines={1}>{p.name}</Text>
                <Text style={[styles.stockValue, p.stock === 0 && styles.stockZero]}>
                  stock: {p.stock}/{p.minStock}
                </Text>
              </View>
            ))}
          </>
        )}
      </Section>
    </>
  );
}

function StatCard({ label, value, color, danger }: { label: string; value: number; color: string; danger?: boolean }) {
  return (
    <View style={[styles.statCard, danger && styles.statCardDanger]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Estilos ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  periodBar: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.separator,
    backgroundColor: Colors.background,
  },
  // Control segmentado estilo iOS.
  chipRow: { flexDirection: 'row', backgroundColor: Colors.fill, borderRadius: 9, padding: 2 },
  chip: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 7,
    alignItems: 'center',
  },
  chipSelected: {
    backgroundColor: Colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  chipText: { color: Colors.textPrimary, fontSize: 13, fontWeight: '500' },
  chipTextSelected: { color: Colors.textPrimary, fontWeight: '600' },
  customRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  dateBtn: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
  },
  dateLabel: { ...Typography.caption2, color: Colors.textTertiary, textTransform: 'uppercase' },
  dateValue: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },

  content: { padding: Spacing.lg, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  errorText: { color: Colors.textSecondary, fontSize: 15, marginBottom: Spacing.md, textAlign: 'center' },
  primaryBtn: { backgroundColor: Colors.primaryTint, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: Radius.md },
  primaryBtnText: { color: Colors.primary, fontWeight: '600', fontSize: 17 },
  noData: { backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.md },
  noDataText: { color: Colors.textSecondary, textAlign: 'center', fontSize: 13 },

  section: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 17, fontWeight: '600', letterSpacing: -0.41, color: Colors.textPrimary },

  bigNumber: { fontSize: 34, fontWeight: '700', letterSpacing: 0.37, fontVariant: ['tabular-nums'], color: Colors.textPrimary, marginTop: Spacing.md },
  globalTrack: { height: 6, borderRadius: 3, backgroundColor: Colors.fill, marginTop: Spacing.md, overflow: 'hidden' },
  globalFill: { height: '100%', borderRadius: 3 },
  availRow: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.sm, gap: Spacing.sm },
  availName: { flex: 1, fontSize: 13, color: Colors.textPrimary },
  availTrack: { width: 90, height: 6, borderRadius: 3, backgroundColor: Colors.fill, overflow: 'hidden' },
  availFill: { height: '100%', borderRadius: 3 },
  availPct: { width: 34, fontSize: 12, color: Colors.textSecondary, textAlign: 'right' },

  costSplit: { flexDirection: 'row', gap: Spacing.lg, marginTop: Spacing.sm },
  costSplitText: { fontSize: 13, color: Colors.textSecondary },

  ordersSummary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.md },
  ordersCount: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  ordersAvg: { fontSize: 13, color: Colors.textSecondary },
  statRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  statCard: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  statCardDanger: { backgroundColor: Colors.errorBg },
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 11, color: Colors.textTertiary, marginTop: 2 },
  typeBreakdown: { fontSize: 13, color: Colors.textSecondary, marginTop: Spacing.md },

  emptyText: { fontSize: 13, color: Colors.textSecondary, marginTop: Spacing.sm },
  failingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.separator,
    gap: Spacing.sm,
  },
  failingDotView: { width: 8, height: 8, borderRadius: 4 },
  failingName: { flex: 1, fontSize: 14, color: Colors.textPrimary },
  failingCount: { fontSize: 13, color: Colors.textSecondary },
  failingCost: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, width: 60, textAlign: 'right' },

  stockOk: { fontSize: 13, color: Colors.textSecondary, marginTop: Spacing.sm },
  stockWarn: { fontSize: 13, fontWeight: '600', color: Colors.errorText, marginTop: Spacing.sm, marginBottom: Spacing.xs },
  stockRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.xs },
  stockName: { flex: 1, fontSize: 13, color: Colors.textPrimary },
  stockValue: { fontSize: 13, color: Colors.textSecondary },
  stockZero: { color: Colors.statusFuera, fontWeight: '700' },

  skeleton: { backgroundColor: Colors.fill, borderRadius: Radius.lg, marginBottom: Spacing.md },
});
