import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { ChevronRight, MapPin, Plus, Printer as PrinterIcon, SlidersHorizontal } from 'lucide-react-native';
import { Colors, Icons, Radius, Shadows, Spacing, Typography, tint } from '../constants/theme';
import { PRINTER_STATUS, daysUntilMaintenance } from '../constants/printers';
import { printerService, PrinterResponse } from '../services/printerService';
import { useAuth } from '../hooks/useAuth';
import ScreenHeader from '../components/ui/ScreenHeader';
import Skeleton from '../components/ui/Skeleton';
import ErrorState from '../components/ui/ErrorState';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';
import PressableScale from '../components/ui/PressableScale';

// Configuración › Impresoras y Mantenimiento: estado de cada impresora, su próximo
// mantenimiento y acceso directo al detalle y a la vida útil de sus repuestos.
export default function SettingsPrintersScreen() {
  const navigation = useNavigation<any>();
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
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Error al cargar impresoras');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Al volver (p. ej. tras cambiar el estado de una impresora) se refresca sin skeleton.
  useFocusEffect(
    useCallback(() => {
      load(loaded.current);
    }, [load]),
  );

  const openDetail = (p: PrinterResponse) =>
    navigation.navigate('InicioStack', { screen: 'PrinterDetail', params: { printer: p } });
  const openComponents = (p: PrinterResponse) =>
    navigation.navigate('InicioStack', {
      screen: 'PrinterComponents',
      params: { printerId: p.id, printerName: p.name || p.model },
    });
  const addPrinter = () => navigation.navigate('InicioStack', { screen: 'AddPrinter' });

  if (loading && printers.length === 0) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Impresoras y Mantenimiento" />
        <View style={styles.content}>
          {[0, 1, 2].map(i => <Skeleton key={i} style={styles.skeleton} />)}
        </View>
      </View>
    );
  }

  if (error && printers.length === 0) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Impresoras y Mantenimiento" />
        <ErrorState error={error} onRetry={() => load()} />
      </View>
    );
  }

  const dueCount = printers.filter(p => {
    const d = daysUntilMaintenance(p.nextMaintenanceDate);
    return d != null && d <= 7;
  }).length;

  return (
    <View style={styles.container}>
      <ScreenHeader title="Impresoras y Mantenimiento" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={Colors.primary} />}
      >
        {printers.length === 0 ? (
          <EmptyState
            icon={<PrinterIcon color={Colors.textTertiary} size={44} strokeWidth={1.5} />}
            title="Sin impresoras"
            description="Registrá tu primera impresora para empezar a controlar su mantenimiento."
          />
        ) : (
          <>
            <Text style={styles.summary}>
              {printers.length} {printers.length === 1 ? 'impresora' : 'impresoras'}
              {dueCount > 0 ? ` · ${dueCount} con mantenimiento vencido o esta semana` : ''}
            </Text>
            {printers.map(p => (
              <PrinterCard key={p.id} printer={p} onOpen={() => openDetail(p)} onComponents={() => openComponents(p)} />
            ))}
          </>
        )}

        {isManager && (
          <Button
            title="Agregar impresora"
            variant="tinted"
            icon={<Plus color={Colors.primary} size={Icons.md} strokeWidth={2} />}
            onPress={addPrinter}
            style={styles.addBtn}
          />
        )}
      </ScrollView>
    </View>
  );
}

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

function PrinterCard({ printer, onOpen, onComponents }: {
  printer: PrinterResponse;
  onOpen: () => void;
  onComponents: () => void;
}) {
  const status = PRINTER_STATUS[printer.status] ?? { label: 'Sin estado', color: Colors.statusUnknown };
  const maintenance = maintenanceLabel(printer.nextMaintenanceDate);

  return (
    <View style={styles.card}>
      <PressableScale style={styles.cardMain} scaleTo={0.98} onPress={onOpen} accessibilityRole="button"
        accessibilityLabel={`${printer.name || printer.model}, ${status.label}`}>
        <View style={[styles.iconWrap, { backgroundColor: tint(status.color, 0.14) }]}>
          <PrinterIcon color={status.color} size={Icons.md} strokeWidth={Icons.strokeWidth} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.name} numberOfLines={1}>{printer.name || `${printer.brand} ${printer.model}`}</Text>
          <Text style={styles.meta} numberOfLines={1}>
            {printer.brand} {printer.model}
          </Text>
          {printer.location ? (
            <View style={styles.locationRow}>
              <MapPin color={Colors.textTertiary} size={12} strokeWidth={2} />
              <Text style={styles.meta} numberOfLines={1}>{printer.location}</Text>
            </View>
          ) : null}
        </View>
        <View style={[styles.statusPill, { backgroundColor: tint(status.color, 0.14) }]}>
          <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
        <ChevronRight color={Colors.textTertiary} size={18} />
      </PressableScale>

      <View style={styles.cardFooter}>
        <Text style={[styles.maintenance, { color: maintenance.color }]} numberOfLines={1}>{maintenance.text}</Text>
        <PressableScale style={styles.componentsBtn} onPress={onComponents} accessibilityRole="button"
          accessibilityLabel="Vida útil de repuestos">
          <SlidersHorizontal color={Colors.primary} size={Icons.sm} strokeWidth={2} />
          <Text style={styles.componentsText}>Repuestos</Text>
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: 100, gap: Spacing.md },
  skeleton: { height: 110, borderRadius: Radius.lg },
  summary: { ...Typography.footnote, color: Colors.textSecondary },

  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, ...Shadows.cardLight },
  cardMain: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg },
  iconWrap: { width: 42, height: 42, borderRadius: Radius.sm, justifyContent: 'center', alignItems: 'center' },
  name: { ...Typography.headline, color: Colors.textPrimary },
  meta: { ...Typography.footnote, color: Colors.textSecondary, flexShrink: 1 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  statusPill: { borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 3 },
  statusText: { ...Typography.caption, fontWeight: '600' },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.separator,
  },
  maintenance: { ...Typography.footnote, flex: 1 },
  componentsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryTint,
  },
  componentsText: { ...Typography.footnote, fontWeight: '600', color: Colors.primary },

  addBtn: { marginTop: Spacing.sm },
});
