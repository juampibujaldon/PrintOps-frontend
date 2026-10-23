// src/screens/JobsScreen.tsx — /jobs
// Cola de trabajos de impresión: lo que se está imprimiendo, lo que espera (por prioridad) y
// el historial. Los presupuestos aceptados entran solos; también se pueden cargar a mano.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, Cylinder, Pencil, Play, Plus, Printer, RotateCcw, Weight, XCircle } from 'lucide-react';
import { Badge, Button, Card, ErrorState, Modal, ScreenHeader, SegmentedControl, Skeleton, TextField } from '../components/ui';
import { useConfirm } from '../context/ConfirmContext';
import { useToast } from '../context/ToastContext';
import { useLiveEvent, useLiveTelemetry } from '../hooks/useLiveTelemetry';
import { apiErrorMessage } from '../services/authService';
import { jobService } from '../services/jobService';
import { printerService } from '../services/printerService';
import type { PrinterResponse } from '../services/printerService';
import { spoolService } from '../services/spoolService';
import type { FilamentSpool, PrintJob, PrintJobRequest, PrintJobStatus } from '../api/types';
import { FILAMENT_TYPES } from '../types/quote';
import type { FilamentType } from '../types/quote';
import styles from './FeatureScreens.module.css';

const STATUS: Record<PrintJobStatus, { label: string; color: string }> = {
  QUEUED: { label: 'En espera', color: '#8E8E93' },
  PRINTING: { label: 'Imprimiendo', color: '#0A84FF' },
  DONE: { label: 'Terminado', color: '#34C759' },
  FAILED: { label: 'Falló', color: '#FF3B30' },
  CANCELLED: { label: 'Cancelado', color: '#AEAEB2' },
};

const hours = (h: number) => (h >= 1 ? `${h.toFixed(1)} h` : `${Math.round(h * 60)} min`);
const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : '—');

type View = 'queue' | 'history';

export default function JobsScreen() {
  const confirm = useConfirm();
  const { showToast } = useToast();
  const telemetry = useLiveTelemetry();
  const [view, setView] = useState<View>('queue');
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [printers, setPrinters] = useState<PrinterResponse[]>([]);
  const [spools, setSpools] = useState<FilamentSpool[]>([]);
  const [editing, setEditing] = useState<PrintJob | 'new' | null>(null);
  const [finishing, setFinishing] = useState<PrintJob | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(
    async (quiet = false) => {
      if (!quiet) setLoading(true);
      try {
        setJobs(await jobService.list(view === 'queue'));
        setError(null);
      } catch (e) {
        if (!quiet) setError(apiErrorMessage(e, 'No se pudo cargar la cola de trabajos.'));
      } finally {
        setLoading(false);
      }
    },
    [view],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    printerService.getAllPrinters().then(setPrinters).catch(() => {});
    spoolService.list(false).then(setSpools).catch(() => {});
  }, []);

  // La cola cambia en vivo (otro usuario, presupuesto aceptado, telemetría del agente).
  const quietReload = useCallback(() => void load(true), [load]);
  useLiveEvent('jobs', quietReload);

  const run = async (job: PrintJob, action: () => Promise<PrintJob>, ok?: string) => {
    setBusyId(job.id);
    try {
      await action();
      if (ok) showToast(ok, { type: 'success' });
      await load(true);
    } catch (e) {
      showToast(apiErrorMessage(e, 'No se pudo actualizar el trabajo.'), { type: 'error' });
    } finally {
      setBusyId(null);
    }
  };

  const printing = useMemo(() => jobs.filter((j) => j.status === 'PRINTING'), [jobs]);
  const queued = useMemo(() => jobs.filter((j) => j.status === 'QUEUED'), [jobs]);
  const queuedHours = queued.reduce((s, j) => s + j.estimatedHours, 0);

  const renderCard = (job: PrintJob) => {
    const st = STATUS[job.status as PrintJobStatus];
    const live = job.printerId != null ? telemetry.get(job.printerId) : undefined;
    const showLive = job.status === 'PRINTING' && live?.online && live.state === 'PRINTING';
    const busy = busyId === job.id;
    return (
      <Card key={job.id} className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <h3 className={styles.cardTitle}>
              {job.quoteId && job.quoteNumber && job.title.startsWith(job.quoteNumber) ? (
                <>
                  <Link to={`/quotes/${job.quoteId}`}>{job.quoteNumber}</Link>
                  {job.title.slice(job.quoteNumber.length)}
                </>
              ) : (
                job.title
              )}
            </h3>
            {(job.quoteNumber || job.clientName) && !(job.quoteNumber && job.title.startsWith(job.quoteNumber)) && (
              <p className={styles.cardSub}>
                {job.quoteId ? <Link to={`/quotes/${job.quoteId}`}>{job.quoteNumber}</Link> : null}
                {job.clientName ? ` · ${job.clientName}` : ''}
              </p>
            )}
          </div>
          <Badge label={st.label} color={st.color} pulse={job.status === 'PRINTING'} />
        </div>

        <p className={styles.meta}>
          <span>
            <Printer size={14} aria-hidden="true" /> {job.printerName ?? 'Sin impresora'}
          </span>
          <span>
            <Clock size={14} aria-hidden="true" /> {hours(job.actualHours ?? job.estimatedHours)}
          </span>
          <span>
            <Weight size={14} aria-hidden="true" /> {Math.round(job.actualGrams ?? job.filamentGrams)} g{job.filamentType ? ` ${job.filamentType}` : ''}
          </span>
          {job.spoolLabel && (
            <span>
              <Cylinder size={14} aria-hidden="true" /> {job.spoolLabel}
            </span>
          )}
          {job.units > 1 && <span>{job.units} u.</span>}
          {job.priority > 0 && <span>Prioridad {job.priority}</span>}
        </p>

        {showLive && (
          <>
            <div className={styles.progress} role="progressbar" aria-valuenow={Math.round(live!.progress ?? 0)} aria-valuemin={0} aria-valuemax={100} aria-label="Progreso de impresión">
              <div className={styles.progressBar} style={{ width: `${live!.progress ?? 0}%` }} />
            </div>
            <p className={styles.live}>
              <span>{Math.round(live!.progress ?? 0)}% · {live!.jobName ?? 'imprimiendo'}</span>
              <span>
                {live!.remainingSeconds != null ? `quedan ${hours(live!.remainingSeconds / 3600)}` : ''}
                {live!.nozzleTemp != null ? ` · ${Math.round(live!.nozzleTemp)} °C` : ''}
              </span>
            </p>
          </>
        )}

        {view === 'history' && (
          <p className={styles.hint}>
            {job.status === 'DONE' ? 'Terminó' : 'Cerrado'} el {fmtDate(job.finishedAt)}
            {job.notes ? ` · ${job.notes}` : ''}
          </p>
        )}

        <div className={styles.actions}>
          {job.status === 'QUEUED' && (
            <>
              <Button title="Iniciar" size="sm" fullWidth={false} icon={<Play size={15} aria-hidden="true" />} loading={busy}
                disabled={!job.printerId}
                onPress={() => void run(job, () => jobService.start(job.id), 'Trabajo iniciado.')} />
              <Button title="Editar" size="sm" variant="secondary" fullWidth={false} icon={<Pencil size={15} aria-hidden="true" />}
                onPress={() => setEditing(job)} />
            </>
          )}
          {job.status === 'PRINTING' && (
            <>
              <Button title="Terminar" size="sm" fullWidth={false} icon={<CheckCircle2 size={15} aria-hidden="true" />}
                onPress={() => setFinishing(job)} />
              <Button title="Falló" size="sm" variant="secondary" fullWidth={false} icon={<XCircle size={15} aria-hidden="true" />} loading={busy}
                onPress={async () => {
                  const reason = window.prompt('¿Qué pasó? (opcional)') ?? undefined;
                  void run(job, () => jobService.fail(job.id, reason));
                }} />
            </>
          )}
          {(job.status === 'QUEUED' || job.status === 'PRINTING') && (
            <Button title="Cancelar" size="sm" variant="ghost" fullWidth={false}
              onPress={async () => {
                if (await confirm({ title: 'Cancelar trabajo', message: `¿Cancelar «${job.title}»?`, confirmLabel: 'Cancelar trabajo', cancelLabel: 'Volver', destructive: true })) {
                  void run(job, () => jobService.cancel(job.id));
                }
              }} />
          )}
          {(job.status === 'FAILED' || job.status === 'CANCELLED') && (
            <Button title="Reintentar" size="sm" variant="tinted" fullWidth={false} icon={<RotateCcw size={15} aria-hidden="true" />} loading={busy}
              onPress={() => void run(job, () => jobService.requeue(job.id), 'Volvió a la cola.')} />
          )}
        </div>
        {job.status === 'QUEUED' && !job.printerId && <p className={styles.hint}>Asigná una impresora para poder iniciarlo.</p>}
      </Card>
    );
  };

  return (
    <>
      <ScreenHeader
        title="Cola de trabajos"
        subtitle={view === 'queue' ? `${printing.length} imprimiendo · ${queued.length} en espera (${hours(queuedHours)})` : 'Historial'}
        rightContent={
          <Button title="Nuevo trabajo" size="sm" fullWidth={false} icon={<Plus size={16} aria-hidden="true" />} onPress={() => setEditing('new')} />
        }
      />

      <div className={styles.toolbar}>
        <SegmentedControl<View>
          ariaLabel="Vista"
          value={view}
          onChange={setView}
          options={[
            { value: 'queue', label: 'Cola actual' },
            { value: 'history', label: 'Historial' },
          ]}
        />
        <p className={styles.hint}>Los presupuestos aceptados entran solos a la cola.</p>
      </div>

      {loading ? (
        <div className={styles.grid}>
          {[0, 1, 2].map((i) => <Skeleton key={i} height={150} />)}
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={() => void load()} />
      ) : view === 'queue' ? (
        <div className={styles.columns}>
          <section className={styles.column} aria-label="Imprimiendo">
            <h2 className={styles.columnTitle}>
              Imprimiendo <span className={styles.count}>{printing.length}</span>
            </h2>
            {printing.length === 0 ? <p className={styles.empty}>Ninguna impresora está trabajando.</p> : printing.map(renderCard)}
          </section>
          <section className={styles.column} aria-label="En espera">
            <h2 className={styles.columnTitle}>
              En espera <span className={styles.count}>{queued.length}</span>
            </h2>
            {queued.length === 0 ? <p className={styles.empty}>No hay trabajos en espera.</p> : queued.map(renderCard)}
          </section>
        </div>
      ) : jobs.length === 0 ? (
        <p className={styles.empty}>Todavía no hay trabajos terminados.</p>
      ) : (
        <div className={styles.grid}>{jobs.map(renderCard)}</div>
      )}

      {editing && (
        <JobFormModal
          job={editing === 'new' ? null : editing}
          printers={printers}
          spools={spools}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void load(true);
          }}
        />
      )}

      {finishing && (
        <FinishJobModal
          job={finishing}
          onClose={() => setFinishing(null)}
          onDone={() => {
            setFinishing(null);
            showToast('Trabajo terminado. Se registró el uso de la impresora.', { type: 'success' });
            void load(true);
          }}
        />
      )}
    </>
  );
}

function JobFormModal({ job, printers, spools, onClose, onSaved }: {
  job: PrintJob | null;
  printers: PrinterResponse[];
  spools: FilamentSpool[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { showToast } = useToast();
  const [title, setTitle] = useState(job?.title ?? '');
  const [printerId, setPrinterId] = useState<string>(job?.printerId ? String(job.printerId) : '');
  const [spoolId, setSpoolId] = useState<string>(job?.spoolId ? String(job.spoolId) : '');
  const [estimatedHours, setHours] = useState(job ? String(job.estimatedHours) : '');
  const [grams, setGrams] = useState(job ? String(job.filamentGrams) : '');
  const [units, setUnits] = useState(job ? String(job.units) : '1');
  const [priority, setPriority] = useState(job ? String(job.priority) : '0');
  const [type, setType] = useState<FilamentType>((job?.filamentType as FilamentType) ?? 'PLA');
  const [notes, setNotes] = useState(job?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const n = (v: string) => Number(v.replace(',', '.'));

  const save = async () => {
    if (!title.trim()) {
      showToast('Poné un título al trabajo.', { type: 'error' });
      return;
    }
    const body: PrintJobRequest = {
      title: title.trim(),
      priority: Number.isFinite(n(priority)) ? Math.round(n(priority)) : 0,
      units: Math.max(1, Math.round(n(units)) || 1),
      estimatedHours: n(estimatedHours) || 0,
      filamentGrams: n(grams) || 0,
      filamentType: type,
      printerId: printerId ? Number(printerId) : undefined,
      spoolId: spoolId ? Number(spoolId) : undefined,
      notes: notes.trim() || undefined,
    };
    setSaving(true);
    try {
      if (job) await jobService.update(job.id, body);
      else await jobService.create(body);
      onSaved();
    } catch (e) {
      showToast(apiErrorMessage(e, 'No se pudo guardar el trabajo.'), { type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={job ? 'Editar trabajo' : 'Nuevo trabajo'}
      footer={
        <div className={styles.modalActions}>
          <Button title="Cancelar" variant="ghost" fullWidth={false} onPress={onClose} />
          <Button title="Guardar" fullWidth={false} loading={saving} onPress={() => void save()} />
        </div>
      }
    >
      <div className={styles.form}>
        <TextField label="Título" value={title} onChangeText={setTitle} placeholder="Ej: 20 llaveros logo" data-autofocus />
        <label className={styles.select}>
          <span>Impresora</span>
          <select value={printerId} onChange={(e) => setPrinterId(e.target.value)}>
            <option value="">Sin asignar</option>
            {printers.map((p) => (
              <option key={p.id} value={p.id} disabled={p.status !== 'OPERATIVE'}>
                {p.name || p.model}{p.status !== 'OPERATIVE' ? ' (no operativa)' : ''}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.select}>
          <span>Bobina</span>
          <select value={spoolId} onChange={(e) => setSpoolId(e.target.value)}>
            <option value="">Sin bobina</option>
            {spools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.material} {s.color ?? ''} — {Math.round(s.remainingGrams)} g
              </option>
            ))}
          </select>
        </label>
        <label className={styles.select}>
          <span>Material</span>
          <select value={type} onChange={(e) => setType(e.target.value as FilamentType)}>
            {FILAMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <div className={styles.pair}>
          <TextField label="Horas estimadas (total)" inputMode="decimal" value={estimatedHours} onChangeText={setHours} />
          <TextField label="Gramos (total)" inputMode="decimal" value={grams} onChangeText={setGrams} />
        </div>
        <div className={styles.pair}>
          <TextField label="Unidades" inputMode="numeric" value={units} onChangeText={setUnits} />
          <TextField label="Prioridad" inputMode="numeric" value={priority} onChangeText={setPriority} hint="Mayor = antes en la cola" />
        </div>
        <TextField multiline label="Notas" value={notes} onChangeText={setNotes} />
      </div>
    </Modal>
  );
}

function FinishJobModal({ job, onClose, onDone }: { job: PrintJob; onClose: () => void; onDone: () => void }) {
  const { showToast } = useToast();
  const [actualHours, setHours] = useState(String(job.estimatedHours));
  const [actualGrams, setGrams] = useState(String(job.filamentGrams));
  const [saving, setSaving] = useState(false);
  const n = (v: string) => Number(v.replace(',', '.'));

  const finish = async () => {
    setSaving(true);
    try {
      await jobService.finish(job.id, {
        actualHours: Number.isFinite(n(actualHours)) ? n(actualHours) : undefined,
        actualGrams: Number.isFinite(n(actualGrams)) ? n(actualGrams) : undefined,
      });
      onDone();
    } catch (e) {
      showToast(apiErrorMessage(e, 'No se pudo terminar el trabajo.'), { type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Terminar trabajo"
      size="sm"
      footer={
        <div className={styles.modalActions}>
          <Button title="Cancelar" variant="ghost" fullWidth={false} onPress={onClose} />
          <Button title="Terminar" fullWidth={false} loading={saving} onPress={() => void finish()} />
        </div>
      }
    >
      <div className={styles.form}>
        <p className={styles.hint}>
          Las horas y los gramos reales se suman a la impresora (alimentan las reglas de mantenimiento) y se
          descuentan de la bobina.
        </p>
        <div className={styles.pair}>
          <TextField label="Horas reales" inputMode="decimal" value={actualHours} onChangeText={setHours} data-autofocus />
          <TextField label="Gramos reales" inputMode="decimal" value={actualGrams} onChangeText={setGrams} />
        </div>
      </div>
    </Modal>
  );
}
