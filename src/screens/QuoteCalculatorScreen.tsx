// src/screens/QuoteCalculatorScreen.tsx
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Share from 'react-native-share';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Radius, Spacing, Typography } from '../constants/theme';
import { TecnicoStackParamList } from '../navigation/TecnicoStack';
import { quoteService } from '../services/quoteService';
import { printerService, PrinterResponse } from '../services/printerService';
import { useQuoteCalculator, missingFields } from '../hooks/useQuoteCalculator';
import { workspaceService } from '../services/workspaceService';
import {
  FILAMENT_TYPES, FilamentType, Quote, QuoteInputs, QuoteStatus, WearResults, ComponentWear,
  QUOTE_STATUS_LABELS, QUOTE_STATUS_COLORS, QUOTE_TRANSITIONS,
} from '../types/quote';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import TextField from '../components/ui/TextField';
import Card from '../components/ui/Card';
import PressableScale from '../components/ui/PressableScale';
import PrinterSelector from '../components/PrinterSelector';
import WearIndicator from '../components/WearIndicator';
import QuotePdfPreview from '../components/QuotePdfPreview';
import { AlertTriangle } from 'lucide-react-native';

type Props = NativeStackScreenProps<TecnicoStackParamList, 'QuoteCalculator'>;

type Tab = 'calc' | 'wear' | 'pdf';

interface FormState {
  filamentGrams: string;
  filamentPricePerGram: string;
  filamentType: FilamentType;
  printerWatts: string;
  energyPriceKwh: string;
  printingHours: string;
  designHours: string;
  designHourlyRate: string;
  operatorHourlyRate: string;
  marginPercent: string;
  discountPercent: string;
  units: string;
  clientName: string;
  jobDescription: string;
  printerId: number | null;
}

type Action =
  | { type: 'SET'; field: keyof FormState; value: string }
  | { type: 'SET_PRINTER'; printerId: number | null }
  // Completa un campo solo si el usuario todavía no lo tocó (o tiene el valor inicial).
  | { type: 'PREFILL'; field: keyof FormState; value: string }
  | { type: 'LOAD'; quote: Quote };

const initialState: FormState = {
  filamentGrams: '',
  filamentPricePerGram: '',
  filamentType: 'PLA',
  printerWatts: '',
  energyPriceKwh: '',
  printingHours: '',
  designHours: '',
  designHourlyRate: '',
  operatorHourlyRate: '',
  marginPercent: '30',
  discountPercent: '',
  units: '1',
  clientName: '',
  jobDescription: '',
  printerId: null,
};

function reducer(state: FormState, action: Action): FormState {
  switch (action.type) {
    case 'SET':
      return { ...state, [action.field]: action.value };
    case 'SET_PRINTER':
      return { ...state, printerId: action.printerId };
    case 'PREFILL':
      return state[action.field] === initialState[action.field]
        ? { ...state, [action.field]: action.value }
        : state;
    case 'LOAD':
      return {
        filamentGrams: String(action.quote.filamentGrams),
        filamentPricePerGram: String(action.quote.filamentPricePerGram),
        filamentType: action.quote.filamentType,
        printerWatts: String(action.quote.printerWatts),
        energyPriceKwh: String(action.quote.energyPriceKwh),
        printingHours: String(action.quote.printingHours),
        designHours: action.quote.designHours != null ? String(action.quote.designHours) : '',
        designHourlyRate: action.quote.designHourlyRate != null ? String(action.quote.designHourlyRate) : '',
        operatorHourlyRate: action.quote.operatorHourlyRate != null ? String(action.quote.operatorHourlyRate) : '',
        marginPercent: String(action.quote.marginPercent),
        discountPercent: action.quote.discountPercent != null ? String(action.quote.discountPercent) : '',
        units: String(action.quote.units),
        clientName: action.quote.clientName ?? '',
        jobDescription: action.quote.jobDescription ?? '',
        printerId: action.quote.printerId,
      };
  }
}

const num = (v: string) => {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};

const money = (v: number) => `$${v.toFixed(2)}`;

// Prioriza el mensaje del backend; si no, el del error (validación local, red).
const errorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message || error?.message || fallback;

function criticalComponent(wear: WearResults | null): { name: string; percent: number } | null {
  if (!wear) return null;
  const entries: Array<[string, ComponentWear]> = [
    ['la boquilla', wear.nozzle],
    ['el hotend', wear.hotend],
    ['las correas', wear.belts],
    ['los rodamientos', wear.bearings],
    ['la cama caliente', wear.heatbed],
  ];
  const found = entries.find(([, w]) => w.critical);
  return found ? { name: found[0], percent: found[1].percent } : null;
}

export default function QuoteCalculatorScreen({ route, navigation }: Props) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [tab, setTab] = useState<Tab>('calc');
  const [quoteId, setQuoteId] = useState<number | null>(null);
  const [quoteNumber, setQuoteNumber] = useState<string>('');
  const [selectedPrinter, setSelectedPrinter] = useState<PrinterResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [status, setStatus] = useState<QuoteStatus>('DRAFT');
  const [changingStatus, setChangingStatus] = useState(false);
  // El backend solo permite editar borradores: el resto se muestra en solo lectura.
  const locked = status !== 'DRAFT';

  const dirtyRef = useRef(false);

  useLayoutEffect(() => {
    if (route.params?.title) navigation.setOptions({ title: route.params.title });
  }, [navigation, route.params?.title]);

  const updateField = (field: keyof FormState, value: string) => {
    if (locked) return;
    dirtyRef.current = true;
    dispatch({ type: 'SET', field, value });
  };

  // ── Presupuesto nuevo: precargar los valores por defecto del taller ──
  // (sin esto "Precio de energía" quedaba vacío y el formulario nunca era válido:
  // no se calculaba el desgaste y guardar/PDF no hacían nada).
  useEffect(() => {
    if (route.params?.quoteId) return;
    workspaceService
      .getQuoteDefaults()
      .then(d => {
        const prefill: Array<[keyof FormState, number | null | undefined]> = [
          ['energyPriceKwh', d.defaultEnergyPriceKwh],
          ['operatorHourlyRate', d.defaultOperatorHourlyRate],
          ['designHourlyRate', d.defaultDesignHourlyRate],
          ['marginPercent', d.defaultMarginPercent],
        ];
        prefill.forEach(([field, value]) => {
          if (value != null && value > 0) dispatch({ type: 'PREFILL', field, value: String(value) });
        });
      })
      .catch(() => {});
  }, [route.params?.quoteId]);

  // ── Carga en modo edición ──
  useEffect(() => {
    const id = route.params?.quoteId;
    if (!id) return;
    setQuoteId(id);
    quoteService
      .get(id)
      .then(q => {
        setQuoteNumber(q.quoteNumber);
        setStatus(q.status);
        dispatch({ type: 'LOAD', quote: q });
        if (q.printerId) {
          printerService
            .getAllPrinters()
            .then(ps => setSelectedPrinter(ps.find(p => p.id === q.printerId) ?? null))
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, [route.params?.quoteId]);

  const inputs: QuoteInputs = useMemo(
    () => ({
      filamentGrams: num(state.filamentGrams),
      filamentPricePerGram: num(state.filamentPricePerGram),
      filamentType: state.filamentType,
      printerWatts: num(state.printerWatts),
      energyPriceKwh: num(state.energyPriceKwh),
      printingHours: num(state.printingHours),
      designHours: state.designHours ? num(state.designHours) : undefined,
      designHourlyRate: state.designHourlyRate ? num(state.designHourlyRate) : undefined,
      operatorHourlyRate: state.operatorHourlyRate ? num(state.operatorHourlyRate) : undefined,
      marginPercent: num(state.marginPercent) || 30,
      discountPercent: state.discountPercent ? num(state.discountPercent) : undefined,
      units: Math.max(1, Math.round(num(state.units)) || 1),
      printerId: state.printerId,
      clientName: state.clientName.trim() || undefined,
      jobDescription: state.jobDescription.trim() || undefined,
    }),
    [state],
  );

  const { results, wear, isValid: valid } = useQuoteCalculator(inputs);
  const missing = useMemo(() => missingFields(inputs), [inputs]);

  // Antes devolvía null en silencio si el formulario era inválido: guardar y
  // generar PDF "no hacían nada". Ahora se avisa qué falta.
  const persistDraft = useCallback(async (): Promise<Quote> => {
    if (!valid) {
      throw new Error(`Revisá estos campos en la pestaña Calculadora:\n• ${missing.join('\n• ')}`);
    }
    // Un presupuesto que ya no es borrador no se puede editar (PUT → 400):
    // se usa tal como está, p. ej. para generar el PDF.
    if (quoteId && locked) {
      return await quoteService.get(quoteId);
    }
    const q = quoteId ? await quoteService.update(quoteId, inputs) : await quoteService.create(inputs);
    setQuoteId(q.id);
    setQuoteNumber(q.quoteNumber);
    setStatus(q.status);
    return q;
  }, [valid, missing, quoteId, locked, inputs]);

  // Cambio de estado: si es un borrador con cambios (o nuevo) se guarda antes.
  const changeQuoteStatus = (to: QuoteStatus) => {
    const run = async () => {
      setChangingStatus(true);
      try {
        const current = !quoteId || (!locked && dirtyRef.current) ? await persistDraft() : null;
        const id = current?.id ?? quoteId!;
        const updated = await quoteService.updateStatus(id, to);
        dirtyRef.current = false;
        setStatus(updated.status);
      } catch (error: any) {
        Alert.alert('No se pudo cambiar el estado', errorMessage(error, 'No se pudo cambiar el estado'));
      } finally {
        setChangingStatus(false);
      }
    };
    // Estados finales: pedir confirmación porque no se pueden revertir.
    if (to === 'PAID' || to === 'REJECTED' || status === 'DRAFT') {
      const extra = status === 'DRAFT' ? ' El presupuesto ya no se podrá editar.' : '';
      Alert.alert(
        `Marcar como ${QUOTE_STATUS_LABELS[to].toLowerCase()}`,
        `¿Confirmás el cambio de estado?${extra}`,
        [{ text: 'Cancelar', style: 'cancel' }, { text: 'Confirmar', onPress: run }],
      );
    } else {
      run();
    }
  };

  // ── Interceptar salida con datos sin guardar ──
  useEffect(() => {
    return navigation.addListener('beforeRemove', (e: any) => {
      if (!dirtyRef.current) return;
      e.preventDefault();
      Alert.alert('Guardar borrador', '¿Querés guardar este presupuesto como borrador?', [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Descartar',
          style: 'destructive',
          onPress: () => {
            dirtyRef.current = false;
            navigation.dispatch(e.data.action);
          },
        },
        {
          text: 'Guardar borrador',
          onPress: async () => {
            try {
              await persistDraft();
              navigation.dispatch(e.data.action);
            } catch (error: any) {
              Alert.alert('No se pudo guardar', errorMessage(error, 'No se pudo guardar'));
            }
          },
        },
      ]);
    });
  }, [navigation, persistDraft]);

  const saveDraft = async () => {
    setSaving(true);
    try {
      await persistDraft();
      dirtyRef.current = false;
      Alert.alert('Guardado', 'Presupuesto guardado como borrador.');
    } catch (error: any) {
      Alert.alert('No se pudo guardar', errorMessage(error, 'No se pudo guardar'));
    } finally {
      setSaving(false);
    }
  };

  const generateAndShare = async () => {
    setGenerating(true);
    try {
      const q = await persistDraft();
      const path = await quoteService.downloadPdf(q.id, q.quoteNumber);
      dirtyRef.current = false;
      await Share.open({
        title: `Presupuesto ${q.quoteNumber}`,
        url: `file://${path}`,
        type: 'application/pdf',
      });
    } catch (error: any) {
      // Cerrar la hoja de compartir sin elegir destino no es un error.
      if (String(error?.message ?? '').includes('User did not share')) return;
      Alert.alert('No se pudo generar el PDF', errorMessage(error, 'No se pudo generar el PDF'));
    } finally {
      setGenerating(false);
    }
  };

  const onSelectPrinter = (p: PrinterResponse | null) => {
    if (locked) return;
    setSelectedPrinter(p);
    dispatch({ type: 'SET_PRINTER', printerId: p?.id ?? null });
    if (p?.watts != null) {
      updateField('printerWatts', String(p.watts));
    }
    dirtyRef.current = true;
  };

  const critical = criticalComponent(wear);

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabBar}>
        {(
          [
            { key: 'calc', label: 'Calculadora' },
            { key: 'wear', label: 'Desgaste' },
            { key: 'pdf', label: 'PDF' },
          ] as Array<{ key: Tab; label: string }>
        ).map(t => (
          <PressableScale key={t.key} style={[styles.tab, tab === t.key && styles.tabActive]} onPress={() => setTab(t.key)}>
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </PressableScale>
        ))}
      </View>

      {/* Estado del presupuesto y próximos pasos */}
      <View style={styles.statusBar}>
        <View style={styles.statusInfo}>
          <Badge
            label={QUOTE_STATUS_LABELS[status]}
            color={QUOTE_STATUS_COLORS[status]}
          />
          <Text style={styles.statusHint} numberOfLines={1}>
            {quoteId ? (quoteNumber || 'Guardado') : 'Sin guardar'}
            {locked ? ' · solo lectura' : ''}
          </Text>
        </View>
        <View style={styles.statusActions}>
          {QUOTE_TRANSITIONS[status].map(t => (
            <PressableScale
              key={t.to}
              style={[styles.statusBtn, { backgroundColor: QUOTE_STATUS_COLORS[t.to] }, changingStatus && styles.disabledBtn]}
              onPress={() => changeQuoteStatus(t.to)}
              disabled={changingStatus}
              accessibilityRole="button"
            >
              <Text style={styles.statusBtnText}>{t.label}</Text>
            </PressableScale>
          ))}
        </View>
      </View>

      {tab === 'calc' && (
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Precio final */}
          <Card style={styles.priceCard}>
            <Text style={styles.priceLabel}>Precio final</Text>
            <Text style={styles.priceValue}>{money(results.totalPrice)}</Text>
            <Text style={styles.priceHint}>{inputs.units} unidad{inputs.units !== 1 ? 'es' : ''} · margen {Math.round(inputs.marginPercent)}%</Text>
          </Card>

          {critical && (
            <PressableScale style={styles.criticalBanner} onPress={() => setTab('wear')}>
              <AlertTriangle color={Colors.errorText} size={16} />
              <Text style={[styles.criticalText, { flex: 1 }]}>
                {critical.name} llegará al {Math.round(critical.percent)}% de su vida útil. Ver desgaste.
              </Text>
            </PressableScale>
          )}

          <Text style={styles.section}>Material</Text>
          <Card style={styles.sectionCard}>
            <View style={styles.chipsWrap}>
              {FILAMENT_TYPES.map(ft => (
                <PressableScale
                  key={ft}
                  style={[styles.chip, state.filamentType === ft && styles.chipActive]}
                  onPress={() => updateField('filamentType', ft)}
                >
                  <Text style={[styles.chipText, state.filamentType === ft && styles.chipTextActive]}>{ft}</Text>
                </PressableScale>
              ))}
            </View>
            <TextField editable={!locked} label="Filamento (gramos)" keyboardType="decimal-pad" value={state.filamentGrams} onChangeText={v => updateField('filamentGrams', v)} placeholder="Ej: 45" />
            <TextField editable={!locked} label="Precio por gramo" keyboardType="decimal-pad" value={state.filamentPricePerGram} onChangeText={v => updateField('filamentPricePerGram', v)} placeholder="Ej: 0.03" />
            <TextField editable={!locked} label="Potencia (watts)" keyboardType="decimal-pad" value={state.printerWatts} onChangeText={v => updateField('printerWatts', v)} placeholder="Ej: 60" />
            <TextField editable={!locked} label="Precio de energía (kWh)" keyboardType="decimal-pad" value={state.energyPriceKwh} onChangeText={v => updateField('energyPriceKwh', v)} placeholder="Ej: 0.12" />
          </Card>

          <Text style={styles.section}>Tiempo</Text>
          <Card style={styles.sectionCard}>
            <TextField editable={!locked} label="Horas de impresión" keyboardType="decimal-pad" value={state.printingHours} onChangeText={v => updateField('printingHours', v)} placeholder="Ej: 3.5" />
            <TextField editable={!locked} label="Horas de diseño (opcional)" keyboardType="decimal-pad" value={state.designHours} onChangeText={v => updateField('designHours', v)} placeholder="Ej: 1" />
            <TextField editable={!locked} label="Tarifa de diseño por hora (opcional)" keyboardType="decimal-pad" value={state.designHourlyRate} onChangeText={v => updateField('designHourlyRate', v)} placeholder="Ej: 15" />
            <TextField editable={!locked} label="Tarifa de operador por hora (opcional)" keyboardType="decimal-pad" value={state.operatorHourlyRate} onChangeText={v => updateField('operatorHourlyRate', v)} placeholder="Ej: 8" />
          </Card>

          <Text style={styles.section}>Negocio</Text>
          <Card style={styles.sectionCard}>
            <TextField editable={!locked} label="Margen (%)" keyboardType="number-pad" value={state.marginPercent} onChangeText={v => updateField('marginPercent', v)} placeholder="30" error={inputs.marginPercent > 1000 ? 'Máximo 1000%' : undefined} />
            <TextField editable={!locked} label="Descuento (%)" keyboardType="number-pad" value={state.discountPercent} onChangeText={v => updateField('discountPercent', v)} placeholder="0" error={(inputs.discountPercent ?? 0) > 50 ? 'Máximo 50%' : undefined} />
            <TextField editable={!locked} label="Unidades" keyboardType="number-pad" value={state.units} onChangeText={v => updateField('units', v)} placeholder="1" />
          </Card>

          <Text style={styles.section}>Cliente</Text>
          <Card style={styles.sectionCard}>
            <TextField editable={!locked} label="Nombre del cliente (opcional)" value={state.clientName} onChangeText={v => updateField('clientName', v)} />
            <TextField editable={!locked} label="Descripción del trabajo (opcional)" multiline value={state.jobDescription} onChangeText={v => updateField('jobDescription', v)} style={styles.multiline} />
            <PrinterSelector selected={selectedPrinter} onSelect={onSelectPrinter} />
          </Card>

          {/* Breakdown colapsable */}
          <PressableScale style={styles.breakdownToggle} onPress={() => setBreakdownOpen(o => !o)}>
            <Text style={styles.breakdownToggleText}>{breakdownOpen ? '▾' : '▸'} Desglose de costos</Text>
          </PressableScale>
          {breakdownOpen && (
            <Card style={styles.sectionCard}>
              <BreakdownRow label="Filamento" value={money(results.filamentCost)} />
              <BreakdownRow label="Energía" value={money(results.energyCost)} />
              <BreakdownRow label="Diseño" value={money(results.designCost)} />
              <BreakdownRow label="Operador" value={money(results.operatorCost)} />
              <BreakdownRow label="Costo total" value={money(results.totalCost)} bold />
              <BreakdownRow label="Ganancia" value={money(results.totalProfit)} />
              <BreakdownRow label="ROI" value={`${results.roi.toFixed(1)}%`} />
            </Card>
          )}

          {!locked && <Button title="Guardar borrador" variant="secondary" onPress={saveDraft} loading={saving} style={styles.actionBtn} />}
        </ScrollView>
      )}

      {tab === 'wear' && (
        <ScrollView contentContainerStyle={styles.scroll}>
          {!selectedPrinter && !state.printerId ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Seleccioná una impresora para ver el desgaste de sus componentes</Text>
            </View>
          ) : wear ? (
            <Card style={styles.sectionCard}>
              <Text style={styles.wearSummary}>
                Este trabajo consume un total de {(inputs.printingHours * inputs.units).toFixed(2)} horas sobre los componentes.
              </Text>
              <WearIndicator label="Boquilla (Nozzle)" percent={wear.nozzle.percent} hoursRemaining={wear.nozzle.hoursRemaining} critical={wear.nozzle.critical} />
              <WearIndicator label="Hotend" percent={wear.hotend.percent} hoursRemaining={wear.hotend.hoursRemaining} critical={wear.hotend.critical} />
              <WearIndicator label="Correas (Belts)" percent={wear.belts.percent} hoursRemaining={wear.belts.hoursRemaining} critical={wear.belts.critical} />
              <WearIndicator label="Rodamientos (Bearings)" percent={wear.bearings.percent} hoursRemaining={wear.bearings.hoursRemaining} critical={wear.bearings.critical} />
              <WearIndicator label="Cama caliente (Heatbed)" percent={wear.heatbed.percent} hoursRemaining={wear.heatbed.hoursRemaining} critical={wear.heatbed.critical} />
            </Card>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {missing.length > 0
                  ? `Para estimar el desgaste revisá: ${missing.join(', ')}.`
                  : 'Calculando desgaste…'}
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {tab === 'pdf' && (
        <ScrollView contentContainerStyle={styles.scroll}>
          <QuotePdfPreview inputs={inputs} results={results} quoteNumber={quoteNumber || undefined} status={status} />
          <Button title="Generar y compartir PDF" onPress={generateAndShare} loading={generating} style={styles.actionBtn} />
          {!locked && <Button title="Guardar borrador" variant="secondary" onPress={saveDraft} loading={saving} style={styles.actionBtn} />}
        </ScrollView>
      )}
    </View>
  );
}

function BreakdownRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.breakdownRow}>
      <Text style={[styles.breakdownLabel, bold && styles.breakdownBold]}>{label}</Text>
      <Text style={[styles.breakdownValue, bold && styles.breakdownBold]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  tabBar: { flexDirection: 'row', marginHorizontal: Spacing.lg, marginTop: Spacing.md, gap: Spacing.sm },
  statusBar: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    gap: Spacing.sm,
  },
  statusInfo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  statusHint: { ...Typography.footnote, color: Colors.textSecondary, flexShrink: 1 },
  statusActions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  statusBtn: { paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: Radius.full },
  statusBtnText: { ...Typography.footnote, fontWeight: '600', color: '#FFFFFF' },
  disabledBtn: { opacity: 0.5 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: Radius.md, backgroundColor: Colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.separator, alignItems: 'center' },
  tabActive: { backgroundColor: Colors.textPrimary, borderColor: Colors.textPrimary },
  tabText: { ...Typography.subheadline, color: Colors.textSecondary, fontWeight: '600' },
  tabTextActive: { color: Colors.background },
  scroll: { padding: Spacing.lg, paddingBottom: 40 },
  priceCard: { alignItems: 'center', paddingVertical: Spacing.lg },
  priceLabel: { ...Typography.labelUppercase, color: Colors.textSecondary },
  priceValue: { ...Typography.largeTitle, ...Typography.tabular, color: Colors.textPrimary, marginVertical: Spacing.xs },
  priceHint: { ...Typography.footnote, color: Colors.textSecondary },
  criticalBanner: { backgroundColor: Colors.errorBg, borderRadius: Radius.md, padding: Spacing.sm, marginBottom: Spacing.md },
  criticalText: { ...Typography.footnote, color: Colors.errorText, fontWeight: '600' },
  section: { ...Typography.labelUppercase, color: Colors.textSecondary, marginTop: Spacing.md, marginBottom: Spacing.sm },
  sectionCard: { padding: Spacing.md },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.sm },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full, borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.separator, backgroundColor: Colors.surface },
  chipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  chipText: { ...Typography.subheadline, color: Colors.textSecondary, fontWeight: '600' },
  chipTextActive: { color: Colors.onAccent },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  breakdownToggle: { paddingVertical: Spacing.sm, marginTop: Spacing.sm },
  breakdownToggleText: { ...Typography.subheadline, color: Colors.accent, fontWeight: '600' },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  breakdownLabel: { ...Typography.subheadline, color: Colors.textSecondary },
  breakdownValue: { ...Typography.subheadline, color: Colors.textPrimary },
  breakdownBold: { fontWeight: '700', color: Colors.textPrimary },
  empty: { paddingVertical: Spacing.xl, alignItems: 'center' },
  emptyText: { ...Typography.subheadline, color: Colors.textSecondary, textAlign: 'center' },
  wearSummary: { ...Typography.footnote, color: Colors.textSecondary, marginBottom: Spacing.md },
  actionBtn: { marginTop: Spacing.md },
});
