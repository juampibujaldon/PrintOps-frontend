// src/screens/QuoteCalculatorScreen.tsx
// Rutas: /quotes/new (quoteId undefined) y /quotes/:quoteId (edición / solo lectura si no es borrador).
// Editor en dos columnas: secciones del presupuesto (izquierda) y resumen de precio, PDF y
// link para el cliente (derecha, fija al hacer scroll).
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useBlocker, useLocation, useParams } from 'react-router-dom';
import { Calculator, Coins, Cpu, Receipt, SlidersHorizontal, User } from 'lucide-react';
import { Badge, Button, Card, Chip, EmptyState, ErrorState, Modal, ScreenHeader, Skeleton, TextField } from '../components/ui';
import PrinterSelector from '../components/PrinterSelector';
import QuotePdfPreview from '../components/QuotePdfPreview';
import WearIndicator from '../components/WearIndicator';
import ExtraCostsEditor from '../components/quote/ExtraCostsEditor';
import QuotePdfPanel from '../components/quote/QuotePdfPanel';
import QuoteShareCard from '../components/quote/QuoteShareCard';
import QuoteSummaryCard from '../components/quote/QuoteSummaryCard';
import SpoolSelect from '../components/quote/SpoolSelect';
import { formatMoney } from '../components/quote/money';
import { useConfirm } from '../context/ConfirmContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../hooks/useAuth';
import { missingFields, useQuoteCalculator } from '../hooks/useQuoteCalculator';
import { printerService } from '../services/printerService';
import type { PrinterResponse } from '../services/printerService';
import { quoteService } from '../services/quoteService';
import { workspaceService } from '../services/workspaceService';
import type { Workspace } from '../services/workspaceService';
import { FILAMENT_TYPES, QUOTE_STATUS_COLORS, QUOTE_STATUS_LABELS, QUOTE_TRANSITIONS } from '../types/quote';
import type { FilamentType, Quote, QuoteInputs, QuoteStatus } from '../types/quote';
import { criticalComponent, initialState, num, reducer } from '../utils/quoteForm';
import type { ExtraCostRow, FormState } from '../utils/quoteForm';
import { canShareFile, downloadBlob, openBlobInNewTab, shareFile } from '../utils/download';
import styles from './QuoteCalculatorScreen.module.css';

// Prioriza el mensaje del backend; si no, el del error (validación local, red).
const errorMessage = (error: unknown, fallback: string) => {
  const e = error as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message || e?.message || fallback;
};

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
  const { user } = useAuth();
  const isManager = user?.role === 'MANAGER';

  const [state, dispatch] = useReducer(reducer, initialState);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteId, setQuoteId] = useState<number | null>(null);
  const [quoteNumber, setQuoteNumber] = useState<string>('');
  const [selectedPrinter, setSelectedPrinter] = useState<PrinterResponse | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [pdf, setPdf] = useState<GeneratedPdf | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [status, setStatus] = useState<QuoteStatus>('DRAFT');
  const [changingStatus, setChangingStatus] = useState(false);
  const [loadingQuote, setLoadingQuote] = useState(routeQuoteId != null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [savingBeforeLeave, setSavingBeforeLeave] = useState(false);
  const wearRef = useRef<HTMLDivElement>(null);
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

  // Datos del taller (logo y nombre para el PDF).
  useEffect(() => {
    workspaceService.getMine().then(setWorkspace).catch(() => setWorkspace(null));
  }, []);

  // ── Presupuesto nuevo: precargar los valores por defecto del taller ──
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

  const applyQuote = useCallback((q: Quote) => {
    setQuote(q);
    setQuoteId(q.id);
    setQuoteNumber(q.quoteNumber);
    setStatus(q.status);
  }, []);

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
        applyQuote(q);
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
  }, [routeQuoteId, reloadKey, applyQuote]);

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
      spoolId: state.spoolId,
      extraCosts: state.extraCosts.map((r) => ({ description: r.description, amount: r.amount.trim() === '' ? 0 : num(r.amount) })),
      draftWatermark: state.draftWatermark,
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
      throw new Error(`Revisá estos campos: ${missing.join(', ')}.`);
    }
    // Un presupuesto que ya no es borrador no se puede editar (PUT → 400): se usa tal como está.
    if (quoteId && locked) {
      return await quoteService.get(quoteId);
    }
    const q = quoteId ? await quoteService.update(quoteId, inputs) : await quoteService.create(inputs);
    if (!quoteId) {
      // Que la URL apunte al presupuesto creado (recargar no debe crear otro). Sin navigate():
      // /quotes/new y /quotes/:quoteId son rutas distintas y remontarían la pantalla.
      window.history.replaceState(window.history.state, '', `/quotes/${q.id}`);
    }
    applyQuote(q);
    return q;
  }, [valid, missing, quoteId, locked, inputs, applyQuote]);

  // ── Cambio de estado: si es un borrador con cambios (o nuevo) se guarda antes ──
  const changeQuoteStatus = async (to: QuoteStatus) => {
    if (to === 'PAID' || to === 'REJECTED' || status === 'DRAFT') {
      const extra = status === 'DRAFT' ? ' El presupuesto ya no se podrá editar.' : '';
      const accepted = to === 'ACCEPTED' ? ' Va a entrar a la cola de impresión.' : '';
      const ok = await confirm({
        title: `Marcar como ${QUOTE_STATUS_LABELS[to].toLowerCase()}`,
        message: `¿Confirmás el cambio de estado?${extra}${accepted}`,
        confirmLabel: 'Confirmar',
      });
      if (!ok) return;
    }
    setChangingStatus(true);
    try {
      const current = !quoteId || (!locked && dirty) ? await persistDraft() : null;
      const id = current?.id ?? quoteId!;
      applyQuote(await quoteService.updateStatus(id, to));
      setDirty(false);
      if (to === 'ACCEPTED') showToast('El trabajo entró a la cola de impresión.', { type: 'success', title: 'Aceptado' });
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

  const pdfFile = useMemo(() => (pdf ? new File([pdf.blob], pdf.filename, { type: 'application/pdf' }) : null), [pdf]);
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

  // ── Link público ──
  const share = async () => {
    setSharing(true);
    try {
      const q = !quoteId || (!locked && dirty) ? await persistDraft() : null;
      applyQuote(await quoteService.share(q?.id ?? quoteId!));
      setDirty(false);
      showToast('Link creado. Copialo o mandalo por WhatsApp.', { type: 'success' });
    } catch (error) {
      showToast(errorMessage(error, 'No se pudo crear el link'), { type: 'error' });
    } finally {
      setSharing(false);
    }
  };

  const unshare = async () => {
    if (!quoteId) return;
    const ok = await confirm({
      title: 'Desactivar link',
      message: 'El link deja de funcionar para el cliente. Podés crear uno nuevo después.',
      confirmLabel: 'Desactivar',
      destructive: true,
    });
    if (!ok) return;
    setSharing(true);
    try {
      applyQuote(await quoteService.unshare(quoteId));
    } catch (error) {
      showToast(errorMessage(error, 'No se pudo desactivar el link'), { type: 'error' });
    } finally {
      setSharing(false);
    }
  };

  const onSelectPrinter = (p: PrinterResponse | null) => {
    if (locked) return;
    setSelectedPrinter(p);
    dispatch({ type: 'SET_PRINTER', printerId: p?.id ?? null });
    if (p?.watts != null) dispatch({ type: 'SET', field: 'printerWatts', value: String(p.watts) });
    markDirty();
  };

  const onSelectSpool = (s: { id: number; pricePerGram: number; material: string } | null) => {
    if (locked) return;
    dispatch({
      type: 'SET_SPOOL',
      spoolId: s?.id ?? null,
      pricePerGram: s?.pricePerGram,
      filamentType: s ? (s.material as FilamentType) : undefined,
    });
    markDirty();
  };

  const onExtrasChange = (rows: ExtraCostRow[]) => {
    if (locked) return;
    dispatch({ type: 'SET_EXTRAS', extraCosts: rows });
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
  const header = (
    <ScreenHeader
      title={title}
      subtitle={quoteNumber || undefined}
      backTo="/quotes"
      rightContent={
        !locked ? (
          <Button
            title={dirty ? 'Guardar' : 'Guardado'}
            size="sm"
            fullWidth={false}
            variant={dirty ? 'primary' : 'secondary'}
            disabled={!dirty && quoteId != null}
            loading={saving}
            onPress={saveDraft}
          />
        ) : undefined
      }
    />
  );

  if (loadingQuote) {
    return (
      <>
        {header}
        <div className={styles.layout} aria-busy="true">
          <div className={styles.sections}>
            <Skeleton height={220} />
            <Skeleton height={220} />
          </div>
          <Skeleton height={360} />
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
    extra: { inputMode?: 'decimal' | 'numeric'; error?: string; hint?: string; suffix?: string } = {},
  ) => (
    <TextField
      label={label}
      inputMode={extra.inputMode ?? 'decimal'}
      readOnly={locked}
      value={state[key] as string}
      onChangeText={(v) => updateField(key, v)}
      placeholder={placeholder}
      error={extra.error}
      hint={extra.hint}
      suffix={extra.suffix}
    />
  );

  return (
    <>
      {header}

      {/* Estado del presupuesto y próximos pasos */}
      <div className={styles.statusBar}>
        <div className={styles.statusInfo}>
          <Badge label={QUOTE_STATUS_LABELS[status]} color={QUOTE_STATUS_COLORS[status]} />
          <span className={styles.statusHint}>
            {quoteId ? (dirty ? 'Cambios sin guardar' : 'Guardado') : 'Sin guardar'}
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

      <div className={styles.layout}>
        <div className={styles.sections}>
          <Section icon={<User size={17} />} title="Cliente y trabajo">
            <TextField label="Cliente" readOnly={locked} value={state.clientName} placeholder="Nombre o empresa"
              onChangeText={(v) => updateField('clientName', v)} />
            <TextField multiline label="Descripción del trabajo" readOnly={locked} value={state.jobDescription}
              placeholder="Ej: 10 soportes de pared en PETG negro" onChangeText={(v) => updateField('jobDescription', v)} />
            {field('Unidades', 'units', '1', { inputMode: 'numeric' })}
          </Section>

          <Section icon={<Cpu size={17} />} title="Impresora y material">
            <PrinterSelector selected={selectedPrinter} onSelect={onSelectPrinter} disabled={locked} />
            <SpoolSelect value={state.spoolId} disabled={locked} onChange={onSelectSpool} />
            <div className={styles.chipsWrap} role="group" aria-label="Tipo de filamento">
              {FILAMENT_TYPES.map((ft) => (
                <Chip key={ft} label={ft} selected={state.filamentType === ft} onPress={() => updateField('filamentType', ft)} />
              ))}
            </div>
            <div className={styles.pair}>
              {field('Filamento por unidad', 'filamentGrams', 'Ej: 45', { suffix: 'g' })}
              {field('Precio por gramo', 'filamentPricePerGram', 'Ej: 20', {
                hint: state.spoolId ? 'Tomado de la bobina' : undefined,
              })}
            </div>
            {field('Potencia de la impresora', 'printerWatts', 'Ej: 120', { suffix: 'W' })}
          </Section>

          <Section icon={<Calculator size={17} />} title="Tiempo y mano de obra">
            <div className={styles.pair}>
              {field('Horas de impresión por unidad', 'printingHours', 'Ej: 3.5', { suffix: 'h' })}
              {field('Precio de la energía', 'energyPriceKwh', 'Ej: 120', { suffix: '$/kWh' })}
            </div>
            <div className={styles.pair}>
              {field('Operador por hora', 'operatorHourlyRate', 'Opcional', { suffix: '$/h' })}
              {field('Horas de diseño', 'designHours', 'Opcional', { suffix: 'h' })}
            </div>
            {field('Diseño por hora', 'designHourlyRate', 'Opcional', { suffix: '$/h' })}
          </Section>

          <Section icon={<Receipt size={17} />} title="Gastos extra" hint="Se cobran a costo, sin margen ni descuento.">
            <ExtraCostsEditor rows={state.extraCosts} readOnly={locked} onChange={onExtrasChange} />
          </Section>

          <Section icon={<Coins size={17} />} title="Precio">
            <div className={styles.pair}>
              {field('Margen', 'marginPercent', '30', {
                inputMode: 'numeric',
                suffix: '%',
                error: inputs.marginPercent > 1000 ? 'Máximo 1000%' : undefined,
              })}
              {field('Descuento', 'discountPercent', '0', {
                inputMode: 'numeric',
                suffix: '%',
                error: (inputs.discountPercent ?? 0) > 50 ? 'Máximo 50%' : undefined,
              })}
            </div>
            <input
              className={styles.marginRange}
              type="range"
              min={0}
              max={300}
              step={5}
              disabled={locked}
              value={Math.min(300, inputs.marginPercent)}
              aria-label="Margen (%)"
              onChange={(e) => updateField('marginPercent', e.target.value)}
            />
            <p className={styles.unitPrice}>
              Precio por unidad: <strong>{formatMoney(results.unitPrice * (1 - (inputs.discountPercent ?? 0) / 100))}</strong>
            </p>
          </Section>

          <div ref={wearRef} className={styles.wide}>
            <Section icon={<SlidersHorizontal size={17} />} title="Desgaste de la impresora">
              {!selectedPrinter && !state.printerId ? (
                <EmptyState title="Elegí una impresora para estimar el desgaste de sus componentes" />
              ) : wear ? (
                <>
                  <p className={styles.wearSummary}>
                    Este trabajo suma {(inputs.printingHours * inputs.units).toFixed(1)} h de uso a los componentes.
                  </p>
                  <div className={styles.wearGrid}>
                    <WearIndicator label="Boquilla" percent={wear.nozzle.percent} hoursRemaining={wear.nozzle.hoursRemaining} critical={wear.nozzle.critical} />
                    <WearIndicator label="Hotend" percent={wear.hotend.percent} hoursRemaining={wear.hotend.hoursRemaining} critical={wear.hotend.critical} />
                    <WearIndicator label="Correas" percent={wear.belts.percent} hoursRemaining={wear.belts.hoursRemaining} critical={wear.belts.critical} />
                    <WearIndicator label="Rodamientos" percent={wear.bearings.percent} hoursRemaining={wear.bearings.hoursRemaining} critical={wear.bearings.critical} />
                    <WearIndicator label="Cama caliente" percent={wear.heatbed.percent} hoursRemaining={wear.heatbed.hoursRemaining} critical={wear.heatbed.critical} />
                  </div>
                  <Button
                    title="Ajustar calidad y reemplazos"
                    variant="tinted"
                    fullWidth={false}
                    icon={<SlidersHorizontal size={18} strokeWidth={2} aria-hidden="true" />}
                    onPress={openComponents}
                  />
                </>
              ) : (
                <EmptyState
                  title={missing.length > 0 ? `Para estimar el desgaste revisá: ${missing.join(', ')}.` : 'Calculando desgaste…'}
                />
              )}
            </Section>
          </div>
        </div>

        <aside className={styles.sidebar} aria-label="Resumen del presupuesto">
          <QuoteSummaryCard
            results={results}
            units={inputs.units}
            marginPercent={inputs.marginPercent}
            discountPercent={inputs.discountPercent ?? 0}
            critical={critical}
            missing={missing}
            onShowWear={() => wearRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          />
          <QuotePdfPanel
            isDraft={status === 'DRAFT'}
            watermark={state.draftWatermark}
            readOnly={locked}
            onWatermarkChange={(v) => {
              dispatch({ type: 'SET_WATERMARK', value: v });
              markDirty();
            }}
            workspace={workspace}
            canEditLogo={isManager}
            onWorkspaceChange={(w) => {
              setWorkspace(w);
              setPdf(null);
            }}
            generating={generating}
            pdfReady={pdf != null}
            shareable={shareable}
            onPreview={() => setPreviewOpen(true)}
            onGenerate={() => void generatePdf()}
            onDownload={() => pdf && downloadBlob(pdf.blob, pdf.filename)}
            onOpen={openPdf}
            onShare={() => pdfFile && void shareFile(pdfFile, `Presupuesto ${quoteNumber}`)}
          />
          {status !== 'REJECTED' && (
            <QuoteShareCard quote={quote} busy={sharing} onShare={() => void share()} onUnshare={() => void unshare()} />
          )}
        </aside>
      </div>

      <Modal open={previewOpen} onClose={() => setPreviewOpen(false)} title="Vista previa del PDF" size="lg">
        <QuotePdfPreview
          inputs={inputs}
          results={results}
          quoteNumber={quoteNumber || undefined}
          status={status}
          watermark={state.draftWatermark}
          workshopName={workspace?.name}
          logoUrl={workspace?.logoUrl}
        />
      </Modal>

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

function Section({ icon, title, hint, children }: { icon: React.ReactNode; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <Card className={styles.section}>
      <header className={styles.sectionHeader}>
        <span className={styles.sectionIcon} aria-hidden="true">{icon}</span>
        <div>
          <h2 className={styles.sectionTitle}>{title}</h2>
          {hint && <p className={styles.sectionHint}>{hint}</p>}
        </div>
      </header>
      <div className={styles.sectionBody}>{children}</div>
    </Card>
  );
}
