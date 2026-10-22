// src/screens/PrinterComponentsScreen.tsx
import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Crosshair, Disc, Flame, Layers, Link2, RefreshCw, RotateCcw } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { tint } from '../constants/theme';
import { PRINTER_STATUS } from '../constants/printers';
import { usePrinterById } from '../hooks/usePrinterById';
import { useAlert, useConfirm } from '../context/ConfirmContext';
import { useToast } from '../context/ToastContext';
import { printerComponentService, QUALITY_OPTIONS } from '../services/printerComponentService';
import type { ComponentQuality, ComponentType, PrinterComponent } from '../services/printerComponentService';
import { Button, ErrorState, ScreenHeader, Skeleton, Spinner, TextField } from '../components/ui';
import { cx } from '../utils/cx';
import styles from './PrinterComponentsScreen.module.css';

const ICONS: Record<ComponentType, LucideIcon> = {
  NOZZLE: Crosshair,
  HOTEND: Flame,
  BELTS: Link2,
  BEARINGS: Disc,
  HEATBED: Layers,
};

const hours = (v: number) => `${Math.round(v).toLocaleString('es-AR')} h`;
const wearColor = (percent: number) =>
  percent >= 90
    ? PRINTER_STATUS.OUT_OF_SERVICE.color
    : percent >= 70
      ? PRINTER_STATUS.MAINTENANCE.color
      : PRINTER_STATUS.OPERATIVE.color;

const apiMessage = (e: unknown, fallback: string) =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

export default function PrinterComponentsScreen() {
  const { printerId, printer } = usePrinterById();
  const [components, setComponents] = useState<PrinterComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (isRefresh = false) => {
      if (printerId == null) {
        setError('No se encontró la impresora.');
        setLoading(false);
        return;
      }
      try {
        if (isRefresh) setRefreshing(true);
        setError(null);
        setComponents(await printerComponentService.list(printerId));
      } catch (e) {
        setError(apiMessage(e, 'No se pudieron cargar los repuestos.'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [printerId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const replaceInList = (updated: PrinterComponent) =>
    setComponents((prev) => prev.map((c) => (c.component === updated.component ? updated : c)));

  const printerName = printer ? printer.name || printer.model : undefined;
  const backTo = printerId != null ? `/printers/${printerId}` : '/printers';

  const header = (
    <ScreenHeader
      title={printerName ?? 'Vida útil de repuestos'}
      subtitle={printerName ? 'Vida útil de repuestos' : undefined}
      backTo={backTo}
      rightContent={
        <Button
          title="Actualizar"
          variant="secondary"
          size="sm"
          fullWidth={false}
          icon={<RefreshCw size={16} />}
          loading={refreshing}
          onPress={() => void load(true)}
        />
      }
    />
  );

  if (loading) {
    return (
      <>
        {header}
        <div className={styles.grid} aria-busy="true">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={220} className={styles.skeleton} />
          ))}
        </div>
      </>
    );
  }

  if (error && components.length === 0) {
    return (
      <>
        {header}
        <ErrorState error={error} onRetry={() => void load()} />
      </>
    );
  }

  return (
    <>
      {header}
      <p className={styles.intro}>
        Elegí la calidad del repuesto instalado para que el desgaste de los presupuestos sea realista. Cuando cambies un
        repuesto, tocá «Lo reemplacé» para reiniciar su contador.
      </p>
      <div className={styles.grid}>
        {components.map((c) => (
          <ComponentCard key={c.component} printerId={printerId!} item={c} onUpdated={replaceInList} />
        ))}
      </div>
    </>
  );
}

function ComponentCard({
  printerId,
  item,
  onUpdated,
}: {
  printerId: number;
  item: PrinterComponent;
  onUpdated: (c: PrinterComponent) => void;
}) {
  const alert = useAlert();
  const confirm = useConfirm();
  const { showToast } = useToast();
  const Icon = ICONS[item.component];
  const color = wearColor(item.percent);
  const [saving, setSaving] = useState<ComponentQuality | 'REPLACE' | null>(null);
  const [customOpen, setCustomOpen] = useState(item.quality === 'CUSTOM');
  const [customHours, setCustomHours] = useState(item.customLifespanHours ? String(item.customLifespanHours) : '');

  const save = async (quality: ComponentQuality, custom?: number) => {
    setSaving(quality);
    try {
      onUpdated(await printerComponentService.update(printerId, item.component, quality, custom));
    } catch (e) {
      showToast(apiMessage(e, 'Intentá de nuevo.'), { type: 'error', title: 'No se pudo guardar' });
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
    if (quality !== item.quality) void save(quality);
  };

  const saveCustom = (e?: FormEvent) => {
    e?.preventDefault();
    const value = parseFloat(customHours.replace(',', '.'));
    if (!(value > 0) || value > 100000) {
      void alert({ title: 'Vida útil inválida', message: 'Ingresá las horas de vida útil (entre 1 y 100.000).' });
      return;
    }
    void save('CUSTOM', value);
  };

  const confirmReplace = async () => {
    const ok = await confirm({
      title: `Reemplazar ${item.label.toLowerCase()}`,
      message: 'El contador de horas de este repuesto vuelve a 0. ¿Confirmás que lo cambiaste?',
      confirmLabel: 'Lo reemplacé',
    });
    if (!ok) return;
    setSaving('REPLACE');
    try {
      onUpdated(await printerComponentService.replace(printerId, item.component));
    } catch (e) {
      showToast(apiMessage(e, 'Intentá de nuevo.'), { type: 'error', title: 'No se pudo registrar' });
    } finally {
      setSaving(null);
    }
  };

  const percent = Math.min(100, Math.max(0, item.percent));

  return (
    <article className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.iconWrap} style={{ backgroundColor: tint(color, 0.14), color }}>
          <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
        </span>
        <div className={styles.headerText}>
          <h2 className={styles.cardTitle}>{item.label}</h2>
          <p className={styles.cardSubtitle}>
            {hours(item.hoursUsed)} de {hours(item.lifespanHours)} · quedan {hours(item.hoursRemaining)}
          </p>
        </div>
        <span className={styles.percent} style={{ color }}>
          {Math.round(item.percent)}%
        </span>
      </div>

      <div
        className={styles.track}
        role="progressbar"
        aria-label={`Desgaste de ${item.label}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
      >
        <div className={styles.fill} style={{ width: `${percent}%`, backgroundColor: color }} />
      </div>

      <span className={styles.label} id={`q-${item.component}`}>
        Calidad del repuesto
      </span>
      <div className={styles.chips} role="group" aria-labelledby={`q-${item.component}`}>
        {QUALITY_OPTIONS.map((opt) => {
          const active = opt.value === 'CUSTOM' ? customOpen : !customOpen && item.quality === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              className={cx(styles.chip, active && styles.chipActive)}
              onClick={() => selectQuality(opt.value)}
              disabled={!!saving}
              aria-pressed={active}
            >
              {saving === opt.value ? <Spinner size={16} /> : opt.label}
            </button>
          );
        })}
      </div>
      <p className={styles.hint}>
        {customOpen
          ? `Estándar: ${hours(item.standardLifespanHours)}.`
          : `${QUALITY_OPTIONS.find((o) => o.value === item.quality)?.hint ?? ''} · estándar ${hours(item.standardLifespanHours)}.`}
        {item.filamentDependent ? ' Valores para PLA/PETG: con ABS/ASA rinde 20% menos, TPU 40% y otros 60%.' : ''}
      </p>

      {customOpen ? (
        <form className={styles.customRow} onSubmit={saveCustom}>
          <TextField
            label="Vida útil (horas)"
            inputMode="decimal"
            value={customHours}
            onChangeText={setCustomHours}
            placeholder={String(Math.round(item.standardLifespanHours))}
            containerClassName={styles.customField}
          />
          <Button title="Guardar" type="submit" fullWidth={false} loading={saving === 'CUSTOM'} className={styles.customBtn} />
        </form>
      ) : null}

      <div className={styles.footer}>
        <p className={styles.replacedText}>
          {item.replacedAt
            ? `Reemplazado el ${new Date(item.replacedAt).toLocaleDateString('es-AR')}`
            : 'Sin reemplazos registrados'}
        </p>
        <Button
          title="Lo reemplacé"
          variant="tinted"
          fullWidth={false}
          icon={<RotateCcw size={16} strokeWidth={2} />}
          onPress={() => void confirmReplace()}
          loading={saving === 'REPLACE'}
          disabled={!!saving}
        />
      </div>
    </article>
  );
}
