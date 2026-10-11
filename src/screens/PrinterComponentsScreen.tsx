// src/screens/PrinterComponentsScreen.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Crosshair, Disc, Flame, Layers, Link2, LucideIcon, RotateCcw } from 'lucide-react-native';
import { Colors, Icons, Radius, Shadows, Spacing, Typography, tint } from '../constants/theme';
import { TecnicoStackParamList } from '../navigation/TecnicoStack';
import {
  ComponentQuality,
  ComponentType,
  PrinterComponent,
  printerComponentService,
  QUALITY_OPTIONS,
} from '../services/printerComponentService';
import Button from '../components/ui/Button';
import TextField from '../components/ui/TextField';
import PressableScale from '../components/ui/PressableScale';
import Skeleton from '../components/ui/Skeleton';
import ErrorState from '../components/ui/ErrorState';

type Props = NativeStackScreenProps<TecnicoStackParamList, 'PrinterComponents'>;

const ICONS: Record<ComponentType, LucideIcon> = {
  NOZZLE: Crosshair,
  HOTEND: Flame,
  BELTS: Link2,
  BEARINGS: Disc,
  HEATBED: Layers,
};

const hours = (v: number) => `${Math.round(v).toLocaleString('es-AR')} h`;
const wearColor = (percent: number) =>
  percent >= 90 ? Colors.statusFuera : percent >= 70 ? Colors.statusMantenim : Colors.statusOperativa;

export default function PrinterComponentsScreen({ route, navigation }: Props) {
  const { printerId, printerName } = route.params;
  const [components, setComponents] = useState<PrinterComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (printerName) navigation.setOptions({ title: printerName });
  }, [navigation, printerName]);

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      setError(null);
      setComponents(await printerComponentService.list(printerId));
    } catch (e: any) {
      setError(e?.response?.data?.message || 'No se pudieron cargar los repuestos.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [printerId]);

  useEffect(() => {
    load();
  }, [load]);

  const replaceInList = (updated: PrinterComponent) =>
    setComponents(prev => prev.map(c => (c.component === updated.component ? updated : c)));

  if (loading) {
    return (
      <View style={styles.container}>
        {[0, 1, 2].map(i => <Skeleton key={i} style={styles.skeleton} />)}
      </View>
    );
  }
  if (error && components.length === 0) {
    return <ErrorState error={error} onRetry={() => load()} />;
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={Colors.primary} />}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.intro}>
        Elegí la calidad del repuesto instalado para que el desgaste de los presupuestos sea realista.
        Cuando cambies un repuesto, tocá «Lo reemplacé» para reiniciar su contador.
      </Text>
      {components.map(c => (
        <ComponentCard key={c.component} printerId={printerId} item={c} onUpdated={replaceInList} />
      ))}
    </ScrollView>
  );
}

function ComponentCard({ printerId, item, onUpdated }: {
  printerId: number;
  item: PrinterComponent;
  onUpdated: (c: PrinterComponent) => void;
}) {
  const Icon = ICONS[item.component];
  const color = wearColor(item.percent);
  const [saving, setSaving] = useState<ComponentQuality | 'REPLACE' | null>(null);
  const [customOpen, setCustomOpen] = useState(item.quality === 'CUSTOM');
  const [customHours, setCustomHours] = useState(item.customLifespanHours ? String(item.customLifespanHours) : '');

  const save = async (quality: ComponentQuality, custom?: number) => {
    setSaving(quality);
    try {
      onUpdated(await printerComponentService.update(printerId, item.component, quality, custom));
    } catch (e: any) {
      Alert.alert('No se pudo guardar', e?.response?.data?.message || 'Intentá de nuevo.');
    } finally {
      setSaving(null);
    }
  };

  const selectQuality = (quality: ComponentQuality) => {
    if (quality === 'CUSTOM') {
      setCustomOpen(true);
      return;
    }
    setCustomOpen(false);
    if (quality !== item.quality) save(quality);
  };

  const saveCustom = () => {
    const value = parseFloat(customHours.replace(',', '.'));
    if (!(value > 0) || value > 100000) {
      Alert.alert('Vida útil inválida', 'Ingresá las horas de vida útil (entre 1 y 100.000).');
      return;
    }
    save('CUSTOM', value);
  };

  const confirmReplace = () => {
    Alert.alert(
      `Reemplazar ${item.label.toLowerCase()}`,
      'El contador de horas de este repuesto vuelve a 0. ¿Confirmás que lo cambiaste?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Lo reemplacé',
          onPress: async () => {
            setSaving('REPLACE');
            try {
              onUpdated(await printerComponentService.replace(printerId, item.component));
            } catch (e: any) {
              Alert.alert('No se pudo registrar', e?.response?.data?.message || 'Intentá de nuevo.');
            } finally {
              setSaving(null);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconWrap, { backgroundColor: tint(color, 0.14) }]}>
          <Icon color={color} size={Icons.md} strokeWidth={Icons.strokeWidth} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.cardTitle}>{item.label}</Text>
          <Text style={styles.cardSubtitle}>
            {hours(item.hoursUsed)} de {hours(item.lifespanHours)} · quedan {hours(item.hoursRemaining)}
          </Text>
        </View>
        <Text style={[styles.percent, { color }]}>{Math.round(item.percent)}%</Text>
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.min(100, item.percent)}%`, backgroundColor: color }]} />
      </View>

      <Text style={styles.label}>Calidad del repuesto</Text>
      <View style={styles.chips}>
        {QUALITY_OPTIONS.map(opt => {
          const active = opt.value === 'CUSTOM' ? customOpen : !customOpen && item.quality === opt.value;
          return (
            <PressableScale
              key={opt.value}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => selectQuality(opt.value)}
              disabled={!!saving}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              {saving === opt.value ? (
                <ActivityIndicator size="small" color={active ? Colors.onPrimary : Colors.primary} />
              ) : (
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
              )}
            </PressableScale>
          );
        })}
      </View>
      <Text style={styles.hint}>
        {customOpen
          ? `Estándar: ${hours(item.standardLifespanHours)}.`
          : `${QUALITY_OPTIONS.find(o => o.value === item.quality)?.hint ?? ''} · estándar ${hours(item.standardLifespanHours)}.`}
        {item.filamentDependent ? ' Valores para PLA/PETG: con ABS/ASA rinde 20% menos, TPU 40% y otros 60%.' : ''}
      </Text>

      {customOpen && (
        <View style={styles.customRow}>
          <TextField
            label="Vida útil (horas)"
            keyboardType="decimal-pad"
            value={customHours}
            onChangeText={setCustomHours}
            placeholder={String(Math.round(item.standardLifespanHours))}
            containerStyle={styles.flex}
          />
          <Button title="Guardar" onPress={saveCustom} loading={saving === 'CUSTOM'} style={styles.customBtn} />
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.replacedText}>
          {item.replacedAt
            ? `Reemplazado el ${new Date(item.replacedAt).toLocaleDateString('es-AR')}`
            : 'Sin reemplazos registrados'}
        </Text>
        <Button
          title="Lo reemplacé"
          variant="tinted"
          icon={<RotateCcw color={Colors.primary} size={Icons.sm} strokeWidth={2} />}
          onPress={confirmReplace}
          loading={saving === 'REPLACE'}
          style={styles.replaceBtn}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flex: 1, backgroundColor: Colors.background },
  container: { padding: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.md, backgroundColor: Colors.background },
  skeleton: { height: 220, borderRadius: Radius.lg },
  intro: { ...Typography.footnote, color: Colors.textSecondary, lineHeight: 18 },

  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, ...Shadows.cardLight },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  iconWrap: { width: 40, height: 40, borderRadius: Radius.sm, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { ...Typography.headline, color: Colors.textPrimary },
  cardSubtitle: { ...Typography.footnote, color: Colors.textSecondary, marginTop: 2, ...Typography.tabular },
  percent: { ...Typography.title3, ...Typography.tabular },
  track: { height: 6, borderRadius: 3, backgroundColor: Colors.fill, overflow: 'hidden', marginTop: Spacing.md },
  fill: { height: '100%', borderRadius: 3 },

  label: { ...Typography.footnote, fontWeight: '600', color: Colors.textSecondary, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    minHeight: 34,
    minWidth: 72,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
    backgroundColor: Colors.fill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipActive: { backgroundColor: Colors.primary },
  chipText: { ...Typography.footnote, fontWeight: '600', color: Colors.textPrimary },
  chipTextActive: { color: Colors.onPrimary },
  hint: { ...Typography.caption, color: Colors.textTertiary, marginTop: Spacing.sm, lineHeight: 16 },

  customRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm, marginTop: Spacing.md },
  customBtn: { marginBottom: Spacing.md, paddingHorizontal: Spacing.lg },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.separator,
  },
  replacedText: { ...Typography.caption, color: Colors.textTertiary, flex: 1 },
  replaceBtn: { paddingHorizontal: Spacing.lg },
});
