// src/screens/PrinterDetailScreen.tsx
import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, RefreshControl, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import QRCode from 'react-native-qrcode-svg';
import {
  AlertTriangle,
  CalendarClock,
  ChevronRight,
  Clock,
  History,
  MapPin,
  Printer,
  Wrench,
  Zap,
} from 'lucide-react-native';
import { Colors, Icons, Radius, Shadows, Spacing, Typography, tint } from '../constants/theme';
import { PRINTER_STATUS, daysUntilMaintenance } from '../constants/printers';
import { TecnicoStackParamList } from '../navigation/TecnicoStack';
import { useAuth } from '../hooks/useAuth';
import { printerService, PrinterResponse, PrinterStatus } from '../services/printerService';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import PressableScale from '../components/ui/PressableScale';
import SettingsSection from '../components/ui/SettingsSection';
import Skeleton from '../components/ui/Skeleton';
import ErrorState from '../components/ui/ErrorState';

type Props = NativeStackScreenProps<TecnicoStackParamList, 'PrinterDetail'>;

const UNKNOWN_STATUS = { label: 'Sin estado', color: Colors.statusUnknown };

// Fechas del backend en formato YYYY-MM-DD (sin hora): se parsean como locales.
const parseDate = (d?: string | null) => {
  if (!d) return null;
  const date = new Date(`${d}T00:00:00`);
  return isNaN(date.getTime()) ? null : date;
};

const formatDate = (d?: string | null) =>
  parseDate(d)?.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' }) ?? null;

export default function PrinterDetailScreen({ route, navigation }: Props) {
  const initial = route.params?.printer;
  const printerId = route.params?.printerId ?? initial?.id;

  const { user } = useAuth();
  const isTecnico = user?.role === 'TECNICO';

  const [printer, setPrinter] = useState<PrinterResponse | null>(initial ?? null);
  const [loading, setLoading] = useState(!initial);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [changingStatus, setChangingStatus] = useState<PrinterStatus | null>(null);

  // Si llegó la impresora por params se muestra al instante y se refresca en
  // segundo plano; si solo llegó el id, se muestra skeleton hasta cargar.
  const load = useCallback(async (mode: 'initial' | 'silent' | 'refresh') => {
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
    } catch (e: any) {
      // En refresco silencioso los datos que ya hay siguen siendo válidos.
      if (mode !== 'silent') {
        setError(e?.response?.data?.message || 'No se pudo cargar la impresora.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [printerId]);

  useEffect(() => {
    load(initial ? 'silent' : 'initial');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  useLayoutEffect(() => {
    if (printer) navigation.setOptions({ title: printer.name || printer.model || 'Impresora' });
  }, [navigation, printer]);

  if (loading && !printer) return <DetailSkeleton />;

  if (!printer) {
    return (
      <View style={styles.centered}>
        <ErrorState error={error ?? 'No se encontró la impresora.'} onRetry={() => load('initial')} />
      </View>
    );
  }

  const status = (printer.status && PRINTER_STATUS[printer.status]) || UNKNOWN_STATUS;

  const changeStatus = (next: PrinterStatus) => {
    if (next === printer.status || changingStatus) return;
    Alert.alert(
      'Cambiar estado',
      `¿Pasar "${printer.name || printer.model}" a "${PRINTER_STATUS[next].label}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cambiar',
          onPress: async () => {
            setChangingStatus(next);
            try {
              setPrinter(await printerService.updateStatus(printer.id, next));
            } catch (e: any) {
              Alert.alert('Error', e?.response?.data?.message || 'No se pudo cambiar el estado.');
            } finally {
              setChangingStatus(null);
            }
          },
        },
      ],
    );
  };
  const daysToMaintenance = daysUntilMaintenance(printer.nextMaintenanceDate);
  const maintenanceAlert =
    daysToMaintenance == null
      ? null
      : daysToMaintenance < 0
        ? {
            color: Colors.statusFuera,
            title: 'Mantenimiento vencido',
            text: `Venció hace ${-daysToMaintenance} ${-daysToMaintenance === 1 ? 'día' : 'días'}.`,
          }
        : daysToMaintenance <= 7
          ? {
              color: Colors.statusMantenim,
              title: 'Mantenimiento próximo',
              text: daysToMaintenance === 0 ? 'Vence hoy.' : `Vence en ${daysToMaintenance} ${daysToMaintenance === 1 ? 'día' : 'días'}.`,
            }
          : null;

  const info = [
    { label: 'Marca', value: printer.brand },
    { label: 'Modelo', value: printer.model },
    { label: 'N° de serie', value: printer.serialNumber, mono: true },
    { label: 'Ubicación', value: printer.location },
    { label: 'Fecha de compra', value: formatDate(printer.purchaseDate) },
  ].filter(r => !!r.value) as { label: string; value: string; mono?: boolean }[];

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} tintColor={Colors.primary} />}
    >
      {/* Hero */}
      <Animated.View entering={FadeIn.duration(300)} style={styles.heroCard}>
        {printer.photoUrl ? (
          <Image source={{ uri: printer.photoUrl }} style={styles.heroImage} resizeMode="cover" />
        ) : (
          <View style={[styles.heroImage, styles.heroPlaceholder, { backgroundColor: tint(status.color, 0.1) }]}>
            <Printer color={status.color} size={56} strokeWidth={1.25} />
          </View>
        )}
        <View style={styles.heroBody}>
          <View style={styles.heroTitleRow}>
            <View style={styles.flex}>
              <Text style={styles.title} numberOfLines={2}>{printer.name || printer.model || 'Impresora'}</Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {[printer.brand, printer.model].filter(Boolean).join(' · ')}
              </Text>
            </View>
            <Badge label={status.label} color={status.color} pulse={printer.status === 'OPERATIVE'} />
          </View>
          {printer.location ? (
            <View style={styles.locationRow}>
              <MapPin color={Colors.textTertiary} size={Icons.sm} strokeWidth={Icons.strokeWidth} />
              <Text style={styles.locationText} numberOfLines={1}>{printer.location}</Text>
            </View>
          ) : null}
        </View>
      </Animated.View>

      {/* Alerta de mantenimiento */}
      {maintenanceAlert && (
        <Animated.View
          entering={FadeInDown.delay(60).duration(300)}
          style={[styles.alert, { backgroundColor: tint(maintenanceAlert.color, 0.12) }]}
        >
          <AlertTriangle color={maintenanceAlert.color} size={Icons.md} strokeWidth={2} />
          <View style={styles.flex}>
            <Text style={[styles.alertTitle, { color: maintenanceAlert.color }]}>{maintenanceAlert.title}</Text>
            <Text style={styles.alertText}>{maintenanceAlert.text}</Text>
          </View>
        </Animated.View>
      )}

      {/* Estado */}
      <Animated.View entering={FadeInDown.delay(80).duration(300)} style={styles.statusPicker}>
        <Text style={styles.statusPickerTitle}>ESTADO</Text>
        <View style={styles.segmented}>
          {(Object.keys(PRINTER_STATUS) as PrinterStatus[]).map(key => {
            const opt = PRINTER_STATUS[key];
            const active = printer.status === key;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.segment, active && { backgroundColor: Colors.surface, ...Shadows.cardLight }]}
                onPress={() => changeStatus(key)}
                disabled={!!changingStatus}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Estado ${opt.label}`}
              >
                {changingStatus === key ? (
                  <ActivityIndicator size="small" color={opt.color} />
                ) : (
                  <>
                    <View style={[styles.segmentDot, { backgroundColor: opt.color }]} />
                    <Text
                      style={[styles.segmentText, active && { color: Colors.textPrimary, fontWeight: '600' }]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {opt.label}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </Animated.View>

      {/* Métricas */}
      <Animated.View entering={FadeInDown.delay(100).duration(300)} style={styles.statsRow}>
        <StatTile
          icon={<Clock color={Colors.primary} size={Icons.md} strokeWidth={Icons.strokeWidth} />}
          value={printer.totalPrintingHours != null ? `${Math.round(printer.totalPrintingHours)} h` : '—'}
          label="Horas de uso"
        />
        <StatTile
          icon={<Zap color={Colors.orange} size={Icons.md} strokeWidth={Icons.strokeWidth} />}
          value={printer.watts != null ? `${printer.watts} W` : '—'}
          label="Consumo"
        />
        <StatTile
          icon={<CalendarClock color={maintenanceAlert?.color ?? Colors.green} size={Icons.md} strokeWidth={Icons.strokeWidth} />}
          value={daysToMaintenance == null ? '—' : daysToMaintenance < 0 ? 'Vencido' : `${daysToMaintenance} d`}
          label="Próx. mant."
        />
      </Animated.View>

      {/* Acciones */}
      <Animated.View entering={FadeInDown.delay(140).duration(300)}>
        {isTecnico && (
          <Button
            title="Nueva orden de mantenimiento"
            icon={<Wrench color={Colors.onPrimary} size={Icons.md} strokeWidth={2} />}
            onPress={() => navigation.navigate('CreateOrder', { printer })}
            style={styles.primaryAction}
          />
        )}
        <View style={styles.actionsRow}>
          <ActionTile
            icon={<Wrench color={Colors.primary} size={Icons.md} strokeWidth={Icons.strokeWidth} />}
            label="Reglas"
            caption="Mantenimiento preventivo"
            onPress={() => navigation.navigate('PrinterRules', { printer })}
          />
          <ActionTile
            icon={<History color={Colors.primary} size={Icons.md} strokeWidth={Icons.strokeWidth} />}
            label="Historial"
            caption="Órdenes y repuestos"
            onPress={() => navigation.navigate('PrinterHistory', { printer })}
          />
        </View>
      </Animated.View>

      {/* Información */}
      {info.length > 0 && (
        <SettingsSection title="Información">
          {info.map((r, i) => (
            <View key={r.label} style={styles.infoRow}>
              <View style={[styles.infoInner, i < info.length - 1 && styles.separator]}>
                <Text style={styles.infoLabel}>{r.label}</Text>
                <Text style={[styles.infoValue, r.mono && styles.mono]} numberOfLines={1} selectable>
                  {r.value}
                </Text>
              </View>
            </View>
          ))}
        </SettingsSection>
      )}

      {/* QR */}
      {printer.qrCodeData ? (
        <SettingsSection title="Código QR" footer="Escaneá este código desde la app para abrir esta impresora.">
          <View style={styles.qrBox}>
            <View style={styles.qrFrame}>
              <QRCode value={printer.qrCodeData} size={168} backgroundColor="#FFFFFF" color="#1C1C1E" />
            </View>
            <Text style={styles.qrCaption} selectable>{printer.serialNumber}</Text>
          </View>
        </SettingsSection>
      ) : null}
    </ScrollView>
  );
}

function StatTile({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <View style={styles.statTile}>
      {icon}
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
    </View>
  );
}

function ActionTile({ icon, label, caption, onPress }: {
  icon: React.ReactNode;
  label: string;
  caption: string;
  onPress: () => void;
}) {
  return (
    <PressableScale style={styles.actionTile} scaleTo={0.97} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <View style={styles.actionIcon}>{icon}</View>
      <View style={styles.flex}>
        <Text style={styles.actionLabel}>{label}</Text>
        <Text style={styles.actionCaption} numberOfLines={1}>{caption}</Text>
      </View>
      <ChevronRight color={Colors.textTertiary} size={Icons.sm} />
    </PressableScale>
  );
}

function DetailSkeleton() {
  return (
    <View style={[styles.scroll, styles.container]}>
      <Skeleton style={styles.skeletonHero} />
      <View style={styles.statsRow}>
        <Skeleton style={styles.skeletonStat} />
        <Skeleton style={styles.skeletonStat} />
        <Skeleton style={styles.skeletonStat} />
      </View>
      <Skeleton style={styles.skeletonBlock} />
      <Skeleton style={styles.skeletonBlock} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: 'center', backgroundColor: Colors.background },
  container: {
    flexGrow: 1,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },

  heroCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    ...Shadows.cardLight,
  },
  heroImage: { width: '100%', height: 190 },
  heroPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  heroBody: { padding: Spacing.lg, gap: Spacing.sm },
  heroTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  title: { ...Typography.title2, color: Colors.textPrimary },
  subtitle: { ...Typography.subheadline, color: Colors.textSecondary, marginTop: 2 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  locationText: { ...Typography.footnote, color: Colors.textTertiary, flexShrink: 1 },

  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    padding: Spacing.md,
    borderRadius: Radius.lg,
  },
  alertTitle: { ...Typography.subheadline, fontWeight: '600' },
  alertText: { ...Typography.footnote, color: Colors.textSecondary, marginTop: 1 },

  statusPicker: { marginHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  statusPickerTitle: { ...Typography.footnote, color: Colors.textSecondary, marginBottom: 6, paddingHorizontal: Spacing.lg },
  segmented: { flexDirection: 'row', backgroundColor: Colors.fill, borderRadius: Radius.md, padding: 3, gap: 3 },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: Spacing.xs,
    borderRadius: Radius.sm,
  },
  segmentDot: { width: 7, height: 7, borderRadius: 4 },
  segmentText: { ...Typography.footnote, color: Colors.textSecondary, flexShrink: 1 },

  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  statTile: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    gap: 4,
    ...Shadows.cardLight,
  },
  statValue: { ...Typography.headline, color: Colors.textPrimary, ...Typography.tabular },
  statLabel: { ...Typography.caption, color: Colors.textSecondary },

  primaryAction: { marginHorizontal: Spacing.lg, marginBottom: Spacing.md },
  actionsRow: { flexDirection: 'row', gap: Spacing.sm, marginHorizontal: Spacing.lg, marginBottom: Spacing.xl },
  actionTile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    ...Shadows.cardLight,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primaryTint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: { ...Typography.subheadline, fontWeight: '600', color: Colors.textPrimary },
  actionCaption: { ...Typography.caption, color: Colors.textSecondary },

  infoRow: { paddingLeft: Spacing.lg },
  infoInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: 46,
    paddingVertical: Spacing.md,
    paddingRight: Spacing.lg,
  },
  separator: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.separator },
  infoLabel: { ...Typography.body, color: Colors.textPrimary },
  infoValue: { ...Typography.body, color: Colors.textSecondary, flexShrink: 1, textAlign: 'right' },
  mono: { ...Typography.tabular, letterSpacing: 0.5 },

  qrBox: { alignItems: 'center', padding: Spacing.xl, gap: Spacing.md, backgroundColor: Colors.surface },
  qrFrame: {
    padding: Spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.separator,
  },
  qrCaption: { ...Typography.footnote, color: Colors.textSecondary, ...Typography.tabular, letterSpacing: 1 },

  skeletonHero: { height: 290, marginHorizontal: Spacing.lg, marginBottom: Spacing.lg, borderRadius: Radius.xl },
  skeletonStat: { flex: 1, height: 84, borderRadius: Radius.lg },
  skeletonBlock: { height: 120, marginHorizontal: Spacing.lg, marginBottom: Spacing.lg, borderRadius: Radius.md },
});
