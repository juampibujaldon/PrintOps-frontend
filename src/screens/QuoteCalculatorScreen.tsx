// src/screens/QuoteCalculatorScreen.tsx
// Rutas: /quotes/new (quoteId undefined) y /quotes/:quoteId (edición / solo lectura si no es borrador).
import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { useBlocker, useLocation, useParams } from 'react-router-dom';
import { AlertTriangle, ChevronDown, ChevronRight, Download, ExternalLink, Share2, SlidersHorizontal } from 'lucide-react';
import { Badge, Button, Card, Chip, EmptyState, ErrorState, Modal, ScreenHeader, Skeleton, TextField } from '../components/ui';
import PrinterSelector from '../components/PrinterSelector';
import QuotePdfPreview from '../components/QuotePdfPreview';
import WearIndicator from '../components/WearIndicator';
import { useConfirm } from '../context/ConfirmContext';
import { useToast } from '../context/ToastContext';
import { missingFields, useQuoteCalculator } from '../hooks/useQuoteCalculator';
import { printerService } from '../services/printerService';
import type { PrinterResponse } from '../services/printerService';
import { quoteService } from '../services/quoteService';
import { workspaceService } from '../services/workspaceService';
import {
  FILAMENT_TYPES,
  QUOTE_STATUS_COLORS,
  QUOTE_STATUS_LABELS,
  QUOTE_TRANSITIONS,
} from '../types/quote';
import type { Quote, QuoteInputs, QuoteStatus } from '../types/quote';
import { criticalComponent, initialState, num, reducer } from '../utils/quoteForm';
import type { FormState } from '../utils/quoteForm';
import { canShareFile, downloadBlob, openBlobInNewTab, shareFile } from '../utils/download';
import { cx } from '../utils/cx';
import styles from './QuoteCalculatorScreen.module.css';

type Tab = 'calc' | 'wear' | 'pdf';

const money = (v: number) => `$${v.toFixed(2)}`;

// Prioriza el mensaje del backend; si no, el del error (validación local, red).
const errorMessage = (error: unknown, fallback: string) => {
  const e = error as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message || e?.message || fallback;
};

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'calc', label: 'Calculadora' },
  { key: 'wear', label: 'Desgaste' },
  { key: 'pdf', label: 'PDF' },
];

interface GeneratedPdf {
  blob: Blob;
  filename: string;
}

export default function QuoteCalculatorScreen() {
  const { quoteId: quoteIdParam } = useParams<{ quoteId?: string }>();
  const routeQuoteId = quoteIdParam ? Number(quoteIdParam) : undefined;
  const location = useLocation();
  const stateTitle = (location.state as { title?: string } | null)?.title;
  const confirm = useConfirm();
  const { showToast } = useToast();

  const [state, dispatch] = useReducer(reducer, initialState);
  const [tab, setTab] = useState<Tab>('calc');
  const [quoteId, setQuoteId] = useState<number | null>(null);
  const [quoteNumber, setQuoteNumber] = useState<string>('');
  const [selectedPrinter, setSelectedPrinter] = useState<PrinterResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [pdf, setPdf] = useState<GeneratedPdf | null>(null);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [status, setStatus] = useState<QuoteStatus>('DRAFT');
  const [changingStatus, setChangingStatus] = useState(false);
  const [loadingQuote, setLoadingQuote] = useState(routeQuoteId != null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [savingBeforeLeave, setSavingBeforeLeave] = useState(false);
  // El backend solo permite editar borradores: el resto se muestra en solo lectura.
  const locked = status !== 'DRAFT';

  const markDirty = () => {
    setDirty(true);
    setPdf(null);
  };

  const updateField = (field: keyof FormState, value: string) => {
    if (locked) return;
    markDirty();
    dispatch({ type: 'SET', field, value });
  };

  // ── Presupuesto nuevo: precargar los valores por defecto del taller ──
  // (sin esto "Precio de energía" quedaba vacío y el formulario nunca era válido).
  useEffect(() => {
    if (routeQuoteId != null) return;
    let cancelled = false;
    workspaceService
      .getQuoteDefaults()
      .then((d) => {
        if (cancelled) return;
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
    return () => {
      cancelled = true;
    };
  }, [routeQuoteId]);

  // ── Carga en modo edición (funciona al recargar: se trae por id) ──
  useEffect(() => {
    if (routeQuoteId == null) return;
    if (!Number.isFinite(routeQuoteId)) {
      setLoadError('Presupuesto inválido.');
      setLoadingQuote(false);
      return;
    }
    let cancelled = false;
    setQuoteId(routeQuoteId);
    setLoadingQuote(true);
    setLoadError(null);
    quoteService
      .get(routeQuoteId)
      .then((q) => {
        if (cancelled) return;
        setQuoteNumber(q.quoteNumber);
        setStatus(q.status);
        dispatch({ type: 'LOAD', quote: q });
        setDirty(false);
        if (q.printerId) {
          printerService
            .getAllPrinters()
            .then((ps) => !cancelled && setSelectedPrinter(ps.find((p) => p.id === q.printerId) ?? null))
            .catch(() => {});
        }
      })
      .catch((e) => !cancelled && setLoadError(errorMessage(e, 'No se pudo cargar el presupuesto.')))
      .finally(() => !cancelled && setLoadingQuote(false));
    return () => {
      cancelled = true;
    };
  }, [routeQuoteId, reloadKey]);

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

  // Si se ajustó la calidad / reemplazos de componentes en otra pestaña, al volver se recalcula el desgaste.
  const [wearRefresh, setWearRefresh] = useState(0);
  useEffect(() => {
    const onFocus = () => setWearRefresh((n) => n + 1);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const { results, wear, isValid: valid } = useQuoteCalculator(inputs, wearRefresh);
  const missing = useMemo(() => missingFields(inputs), [inputs]);

  // Avisa qué falta en vez de no hacer nada si el formulario es inválido.
  const persistDraft = useCallback(async (): Promise<Quote> => {
    if (!valid) {
      throw new Error(`Revisá estos campos en la pestaña Calculadora: ${missing.join(', ')}.`);
    }
    // Un presupuesto que ya no es borrador no se puede editar (PUT → 400):
    // se usa tal como está, p. ej. para generar el PDF.
    if (quoteId && locked) {
      return await quoteService.get(quoteId);
    }
    const q = quoteId ? await quoteService.update(quoteId, inputs) : await quoteService.create(inputs);
    if (!quoteId) {
      // Que la URL apunte al presupuesto creado (recargar no debe crear otro). Sin navigate():
      // /quotes/new y /quotes/:quoteId son rutas distintas y remontarían la pantalla.
      window.history.replaceState(window.history.state, '', `/quotes/${q.id}`);
    }
    setQuoteId(q.id);
    setQuoteNumber(q.quoteNumber);
    setStatus(q.status);
    return q;
  }, [valid, missing, quoteId, locked, inputs]);

  // ── Cambio de estado: si es un borrador con cambios (o nuevo) se guarda antes ──
  const changeQuoteStatus = async (to: QuoteStatus) => {
    // Estados finales: pedir confirmación porque no se pueden revertir.
    if (to === 'PAID' || to === 'REJECTED' || status === 'DRAFT') {
      const extra = status === 'DRAFT' ? ' El presupuesto ya no se podrá editar.' : '';
      const ok = await confirm({
        title: `Marcar como ${QUOTE_STATUS_LABELS[to].toLowerCase()}`,
        message: `¿Confirmás el cambio de estado?${extra}`,
        confirmLabel: 'Confirmar',
      });
      if (!ok) return;
    }
    setChangingStatus(true);
    try {
      const current = !quoteId || (!locked && dirty) ? await persistDraft() : null;
      const id = current?.id ?? quoteId!;
      const updated = await quoteService.updateStatus(id, to);
      setDirty(false);
      setStatus(updated.status);
    } catch (error) {
      showToast(errorMessage(error, 'No se pudo cambiar el estado'), { type: 'error', title: 'No se pudo cambiar el estado' });
    } finally {
      setChangingStatus(false);
    }
  };

  // ── Interceptar salida con datos sin guardar ──
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const saveAndLeave = async () => {
    setSavingBeforeLeave(true);
    try {
      await persistDraft();
      setDirty(false);
      blocker.proceed?.();
    } catch (error) {
      showToast(errorMessage(error, 'No se pudo guardar'), { type: 'error', title: 'No se pudo guardar' });
      blocker.reset?.();
    } finally {
      setSavingBeforeLeave(false);
    }
  };

  const discardAndLeave = () => {
    setDirty(false);
    blocker.proceed?.();
  };

  const saveDraft = async () => {
    setSaving(true);
    try {
      await persistDraft();
      setDirty(false);
      showToast('Presupuesto guardado como borrador.', { type: 'success', title: 'Guardado' });
    } catch (error) {
      showToast(errorMessage(error, 'No se pudo guardar'), { type: 'error', title: 'No se pudo guardar' });
    } finally {
      setSaving(false);
    }
  };

  // ── PDF: se genera (guardando antes si hace falta) y luego se descarga / abre / comparte ──
  const generatePdf = async () => {
    setGenerating(true);
    try {
      const q = await persistDraft();
      const blob = await quoteService.downloadPdf(q.id);
      setDirty(false);
      setPdf({ blob, filename: `Presupuesto-${q.quoteNumber}.pdf` });
      showToast(`Presupuesto ${q.quoteNumber} listo.`, { type: 'success', title: 'PDF generado' });
    } catch (error) {
      showToast(errorMessage(error, 'No se pudo generar el PDF'), { type: 'error', title: 'No se pudo generar el PDF' });
    } finally {
      setGenerating(false);
    }
  };

  const pdfFile = useMemo(
    () => (pdf ? new File([pdf.blob], pdf.filename, { type: 'application/pdf' }) : null),
    [pdf],
  );
  const shareable = pdfFile ? canShareFile(pdfFile) : false;

  const openPdf = () => {
    if (!pdf) return;
    if (!openBlobInNewTab(pdf.blob)) {
      showToast('El navegador bloqueó la ventana. Permití las ventanas emergentes o usá "Descargar".', {
        type: 'error',
        title: 'No se pudo abrir el PDF',
      });
    }
  };

  const sharePdf = async () => {
    if (!pdfFile) return;
    // Cerrar la hoja de compartir sin elegir destino no es un error.
    await shareFile(pdfFile, `Presupuesto ${quoteNumber}`);
  };

  const onSelectPrinter = (p: PrinterResponse | null) => {
    if (locked) return;
    setSelectedPrinter(p);
    dispatch({ type: 'SET_PRINTER', printerId: p?.id ?? null });
    if (p?.watts != null) dispatch({ type: 'SET', field: 'printerWatts', value: String(p.watts) });
    markDirty();
  };

  const openComponents = () => {
    const id = selectedPrinter?.id ?? state.printerId;
    if (id == null) return;
    // Pestaña nueva: el formulario sin guardar se conserva y el desgaste se recalcula al volver.
    window.open(`/printers/${id}/components`, '_blank', 'noopener');
  };

  const critical = criticalComponent(wear);
  const title = stateTitle ?? (routeQuoteId != null ? 'Presupuesto' : 'Nuevo presupuesto');

  const header = <ScreenHeader title={title} subtitle={quoteNumber || undefined} backTo="/quotes" />;

  if (loadingQuote) {
    return (
      <>
        {header}
        <div className={styles.stack} aria-busy="true">
          <Skeleton height={60} className={styles.skeleton} />
          <Skeleton height={120} className={styles.skeleton} />
          <Skeleton height={260} className={styles.skeleton} />
        </div>
      </>
    );
  }

  if (loadError) {
    return (
      <>
        {header}
        <ErrorState error={loadError} onRetry={() => setReloadKey((k) => k + 1)} />
      </>
    );
  }

  const field = (
    label: string,
    key: keyof FormState,
    placeholder: string,
    extra: { inputMode?: 'decimal' | 'numeric'; error?: string } = {},
  ) => (
    <TextField
      label={label}
      inputMode={extra.inputMode ?? 'decimal'}
      readOnly={locked}
      value={state[key] as string}
      onChangeText={(v) => updateField(key, v)}
      placeholder={placeholder}
      error={extra.error}
    />
  );

  return (
    <>
      {header}

      {/* Tabs */}
      <div className={styles.tabBar} role="tablist" aria-label="Secciones del presupuesto">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            id={`quote-tab-${t.key}`}
            aria-selected={tab === t.key}
            aria-controls={`quote-panel-${t.key}`}
            className={cx(styles.tab, tab === t.key && styles.tabActive)}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Estado del presupuesto y próximos pasos */}
      <div className={styles.statusBar}>
        <div className={styles.statusInfo}>
          <Badge label={QUOTE_STATUS_LABELS[status]} color={QUOTE_STATUS_COLORS[status]} />
          <span className={styles.statusHint}>
            {quoteId ? quoteNumber || 'Guardado' : 'Sin guardar'}
            {locked ? ' · solo lectura' : ''}
          </span>
        </div>
        <div className={styles.statusActions}>
          {QUOTE_TRANSITIONS[status].map((t) => (
            <button
              key={t.to}
              type="button"
              className={styles.statusBtn}
              style={{ background: QUOTE_STATUS_COLORS[t.to] }}
              disabled={changingStatus}
              onClick={() => void changeQuoteStatus(t.to)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'calc' && (
        <div id="quote-panel-calc" role="tabpanel" aria-labelledby="quote-tab-calc" className={styles.calcLayout}>
          <aside className={styles.priceCol}>
            <Card className={styles.priceCard}>
              <p className={styles.priceLabel}>Precio final</p>
              <p className={styles.priceValue} aria-live="polite">
                {money(results.totalPrice)}
              </p>
              <p className={styles.priceHint}>
                {inputs.units} unidad{inputs.units !== 1 ? 'es' : ''} · margen {Math.round(inputs.marginPercent)}%
              </p>
            </Card>

            {critical && (
              <button type="button" className={styles.criticalBanner} onClick={() => setTab('wear')}>
                <AlertTriangle size={16} aria-hidden="true" />
                <span>
                  {critical.name} llegará al {Math.round(critical.percent)}% de su vida útil. Ver desgaste.
                </span>
              </button>
            )}

            <button
              type="button"
              className={styles.breakdownToggle}
              aria-expanded={breakdownOpen}
              onClick={() => setBreakdownOpen((o) => !o)}
            >
              {breakdownOpen ? <ChevronDown size={16} aria-hidden="true" /> : <ChevronRight size={16} aria-hidden="true" />}
              Desglose de costos
            </button>
            {breakdownOpen && (
              <Card className={styles.breakdown}>
                <BreakdownRow label="Filamento" value={money(results.filamentCost)} />
                <BreakdownRow label="Energía" value={money(results.energyCost)} />
                <BreakdownRow label="Diseño" value={money(results.designCost)} />
                <BreakdownRow label="Operador" value={money(results.operatorCost)} />
                <BreakdownRow label="Costo total" value={money(results.totalCost)} bold />
                <BreakdownRow label="Ganancia" value={money(results.totalProfit)} />
                <BreakdownRow label="ROI" value={`${results.roi.toFixed(1)}%`} />
              </Card>
            )}

            {!locked && (
              <Button title="Guardar borrador" variant="secondary" onPress={saveDraft} loading={saving} />
            )}
          </aside>

          <div className={styles.formCol}>
            <h2 className={styles.section}>Material</h2>
            <Card className={styles.sectionCard}>
              <div className={styles.chipsWrap} role="group" aria-label="Tipo de filamento">
                {FILAMENT_TYPES.map((ft) => (
                  <Chip key={ft} label={ft} selected={state.filamentType === ft} onPress={() => updateField('filamentType', ft)} />
                ))}
              </div>
              {field('Filamento (gramos)', 'filamentGrams', 'Ej: 45')}
              {field('Precio por gramo', 'filamentPricePerGram', 'Ej: 0.03')}
              {field('Potencia (watts)', 'printerWatts', 'Ej: 60')}
              {field('Precio de energía (kWh)', 'energyPriceKwh', 'Ej: 0.12')}
            </Card>

            <h2 className={styles.section}>Tiempo</h2>
            <Card className={styles.sectionCard}>
              {field('Horas de impresión', 'printingHours', 'Ej: 3.5')}
              {field('Horas de diseño (opcional)', 'designHours', 'Ej: 1')}
              {field('Tarifa de diseño por hora (opcional)', 'designHourlyRate', 'Ej: 15')}
              {field('Tarifa de operador por hora (opcional)', 'operatorHourlyRate', 'Ej: 8')}
            </Card>

            <h2 className={styles.section}>Negocio</h2>
            <Card className={styles.sectionCard}>
              {field('Margen (%)', 'marginPercent', '30', {
                inputMode: 'numeric',
                error: inputs.marginPercent > 1000 ? 'Máximo 1000%' : undefined,
              })}
              {field('Descuento (%)', 'discountPercent', '0', {
                inputMode: 'numeric',
                error: (inputs.discountPercent ?? 0) > 50 ? 'Máximo 50%' : undefined,
              })}
              {field('Unidades', 'units', '1', { inputMode: 'numeric' })}
            </Card>

            <h2 className={styles.section}>Cliente</h2>
            <Card className={styles.sectionCard}>
              <TextField
                label="Nombre del cliente (opcional)"
                readOnly={locked}
                value={state.clientName}
                onChangeText={(v) => updateField('clientName', v)}
              />
              <TextField
                multiline
                label="Descripción del trabajo (opcional)"
                readOnly={locked}
                value={state.jobDescription}
                onChangeText={(v) => updateField('jobDescription', v)}
              />
              <PrinterSelector selected={selectedPrinter} onSelect={onSelectPrinter} disabled={locked} />
            </Card>
          </div>
        </div>
      )}

      {tab === 'wear' && (
        <div id="quote-panel-wear" role="tabpanel" aria-labelledby="quote-tab-wear" className={styles.narrow}>
          {!selectedPrinter && !state.printerId ? (
            <EmptyState title="Seleccioná una impresora para ver el desgaste de sus componentes" />
          ) : wear ? (
            <>
              <Card className={styles.sectionCard}>
                <p className={styles.wearSummary}>
                  Este trabajo consume un total de {(inputs.printingHours * inputs.units).toFixed(2)} horas sobre los
                  componentes.
                </p>
                <WearIndicator label="Boquilla (Nozzle)" percent={wear.nozzle.percent} hoursRemaining={wear.nozzle.hoursRemaining} critical={wear.nozzle.critical} />
                <WearIndicator label="Hotend" percent={wear.hotend.percent} hoursRemaining={wear.hotend.hoursRemaining} critical={wear.hotend.critical} />
                <WearIndicator label="Correas (Belts)" percent={wear.belts.percent} hoursRemaining={wear.belts.hoursRemaining} critical={wear.belts.critical} />
                <WearIndicator label="Rodamientos (Bearings)" percent={wear.bearings.percent} hoursRemaining={wear.bearings.hoursRemaining} critical={wear.bearings.critical} />
                <WearIndicator label="Cama caliente (Heatbed)" percent={wear.heatbed.percent} hoursRemaining={wear.heatbed.hoursRemaining} critical={wear.heatbed.critical} />
              </Card>
              <Button
                title="Ajustar calidad y reemplazos"
                variant="tinted"
                icon={<SlidersHorizontal size={18} strokeWidth={2} aria-hidden="true" />}
                onPress={openComponents}
              />
              <p className={styles.hint}>Se abre en una pestaña nueva: tu presupuesto sin guardar se conserva en esta.</p>
            </>
          ) : (
            <EmptyState
              title={
                missing.length > 0
                  ? `Para estimar el desgaste revisá: ${missing.join(', ')}.`
                  : 'Calculando desgaste…'
              }
            />
          )}
        </div>
      )}

      {tab === 'pdf' && (
        <div id="quote-panel-pdf" role="tabpanel" aria-labelledby="quote-tab-pdf" className={styles.narrow}>
          <QuotePdfPreview inputs={inputs} results={results} quoteNumber={quoteNumber || undefined} status={status} />
          <Button title="Generar PDF" onPress={generatePdf} loading={generating} />
          {pdf && (
            <Card className={styles.pdfActions}>
              <p className={styles.pdfReady}>{pdf.filename}</p>
              <div className={styles.pdfButtons}>
                <Button
                  title="Descargar"
                  variant="secondary"
                  icon={<Download size={18} aria-hidden="true" />}
                  onPress={() => downloadBlob(pdf.blob, pdf.filename)}
                />
                <Button
                  title="Abrir en pestaña nueva"
                  variant="secondary"
                  icon={<ExternalLink size={18} aria-hidden="true" />}
                  onPress={openPdf}
                />
                {shareable && (
                  <Button
                    title="Compartir"
                    variant="secondary"
                    icon={<Share2 size={18} aria-hidden="true" />}
                    onPress={() => void sharePdf()}
                  />
                )}
              </div>
            </Card>
          )}
          {!locked && <Button title="Guardar borrador" variant="secondary" onPress={saveDraft} loading={saving} />}
        </div>
      )}

      <Modal
        open={blocker.state === 'blocked'}
        onClose={() => blocker.reset?.()}
        title="Guardar borrador"
        size="sm"
        alert
        footer={
          <div className={styles.leaveActions}>
            <Button title="Guardar borrador" onPress={() => void saveAndLeave()} loading={savingBeforeLeave} />
            <Button title="Descartar" variant="danger" onPress={discardAndLeave} />
            <Button title="Cancelar" variant="ghost" onPress={() => blocker.reset?.()} />
          </div>
        }
      >
        <p>¿Querés guardar este presupuesto como borrador?</p>
      </Modal>
    </>
  );
}

function BreakdownRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={styles.breakdownRow}>
      <span className={cx(styles.breakdownLabel, bold && styles.breakdownBold)}>{label}</span>
      <span className={cx(styles.breakdownValue, bold && styles.breakdownBold)}>{value}</span>
    </div>
  );
}
