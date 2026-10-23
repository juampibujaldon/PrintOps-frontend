// src/screens/SpoolsScreen.tsx — /spools
// Inventario de filamento por bobina: gramos restantes, costo real y dónde está cargada.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Archive, ArchiveRestore, Cylinder, Pencil, Plus } from 'lucide-react';
import { Badge, Button, Card, EmptyState, ErrorState, Modal, ScreenHeader, SegmentedControl, Skeleton, TextField } from '../components/ui';
import { useToast } from '../context/ToastContext';
import { apiErrorMessage } from '../services/authService';
import { printerService } from '../services/printerService';
import type { PrinterResponse } from '../services/printerService';
import { spoolService } from '../services/spoolService';
import type { FilamentSpool, SpoolRequest } from '../api/types';
import { FILAMENT_TYPES } from '../types/quote';
import type { FilamentType } from '../types/quote';
import styles from './FeatureScreens.module.css';

const money = (v: number) => `$ ${v.toLocaleString('es-AR', { maximumFractionDigits: 2 })}`;

export default function SpoolsScreen() {
  const { showToast } = useToast();
  const [archived, setArchived] = useState(false);
  const [spools, setSpools] = useState<FilamentSpool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [printers, setPrinters] = useState<PrinterResponse[]>([]);
  const [editing, setEditing] = useState<FilamentSpool | 'new' | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSpools(await spoolService.list(archived));
      setError(null);
    } catch (e) {
      setError(apiErrorMessage(e, 'No se pudieron cargar las bobinas.'));
    } finally {
      setLoading(false);
    }
  }, [archived]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    printerService.getAllPrinters().then(setPrinters).catch(() => {});
  }, []);

  const totals = useMemo(() => {
    const grams = spools.reduce((s, x) => s + x.remainingGrams, 0);
    const value = spools.reduce((s, x) => s + (x.remainingGrams * x.costPerKg) / 1000, 0);
    return { grams, value, low: spools.filter((s) => s.low).length };
  }, [spools]);

  const toggleArchive = async (s: FilamentSpool) => {
    try {
      await spoolService.archive(s.id, !s.archived);
      await load();
    } catch (e) {
      showToast(apiErrorMessage(e, 'No se pudo actualizar la bobina.'), { type: 'error' });
    }
  };

  return (
    <>
      <ScreenHeader
        title="Filamento"
        subtitle={!archived && spools.length ? `${(totals.grams / 1000).toFixed(1)} kg en stock · ${money(totals.value)}` : undefined}
        rightContent={<Button title="Nueva bobina" size="sm" fullWidth={false} icon={<Plus size={16} aria-hidden="true" />} onPress={() => setEditing('new')} />}
      />
      <div className={styles.toolbar}>
        <SegmentedControl<'active' | 'archived'>
          ariaLabel="Bobinas"
          value={archived ? 'archived' : 'active'}
          onChange={(v) => setArchived(v === 'archived')}
          options={[
            { value: 'active', label: 'En uso' },
            { value: 'archived', label: 'Archivadas' },
          ]}
        />
        {!archived && totals.low > 0 && <Badge label={`${totals.low} con poco filamento`} color="#FF9500" />}
      </div>

      {loading ? (
        <div className={styles.grid}>{[0, 1, 2].map((i) => <Skeleton key={i} height={150} />)}</div>
      ) : error ? (
        <ErrorState error={error} onRetry={() => void load()} />
      ) : spools.length === 0 ? (
        <EmptyState
          icon={<Cylinder size={44} strokeWidth={1.5} />}
          title={archived ? 'Sin bobinas archivadas' : 'Sin bobinas cargadas'}
          description={archived ? undefined : 'Cargá tus bobinas para que los presupuestos usen el precio real del filamento y se descuente lo consumido.'}
          action={!archived ? <Button title="Nueva bobina" fullWidth={false} onPress={() => setEditing('new')} /> : undefined}
        />
      ) : (
        <div className={styles.grid}>
          {spools.map((s) => (
            <Card key={s.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h3 className={styles.cardTitle}>
                    {s.material} {s.color ?? ''}
                  </h3>
                  <p className={styles.cardSub}>{s.brand ?? 'Sin marca'} · {money(s.costPerKg)}/kg · ${s.pricePerGram}/g</p>
                </div>
                {s.low && <Badge label="Queda poco" color="#FF9500" />}
              </div>
              <div className={styles.progress} role="progressbar" aria-label="Filamento restante" aria-valuenow={Math.round(s.remainingPercent)} aria-valuemin={0} aria-valuemax={100}>
                <div className={styles.progressBar} style={{ width: `${s.remainingPercent}%`, background: s.low ? 'var(--color-orange)' : undefined }} />
              </div>
              <p className={styles.live}>
                <span>{Math.round(s.remainingGrams)} g de {Math.round(s.initialGrams)} g</span>
                <span>{s.remainingPercent}%</span>
              </p>
              <p className={styles.meta}>{s.printerName ? <span>Cargada en {s.printerName}</span> : <span>Sin impresora</span>}</p>
              <div className={styles.actions}>
                {!s.archived && (
                  <Button title="Editar" size="sm" variant="secondary" fullWidth={false} icon={<Pencil size={15} aria-hidden="true" />} onPress={() => setEditing(s)} />
                )}
                <Button
                  title={s.archived ? 'Restaurar' : 'Archivar'}
                  size="sm"
                  variant="ghost"
                  fullWidth={false}
                  icon={s.archived ? <ArchiveRestore size={15} aria-hidden="true" /> : <Archive size={15} aria-hidden="true" />}
                  onPress={() => void toggleArchive(s)}
                />
              </div>
            </Card>
          ))}
        </div>
      )}

      {editing && (
        <SpoolModal
          spool={editing === 'new' ? null : editing}
          printers={printers}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void load();
          }}
        />
      )}
    </>
  );
}

function SpoolModal({ spool, printers, onClose, onSaved }: { spool: FilamentSpool | null; printers: PrinterResponse[]; onClose: () => void; onSaved: () => void }) {
  const { showToast } = useToast();
  const [material, setMaterial] = useState<FilamentType>((spool?.material as FilamentType) ?? 'PLA');
  const [color, setColor] = useState(spool?.color ?? '');
  const [brand, setBrand] = useState(spool?.brand ?? '');
  const [initial, setInitial] = useState(spool ? String(spool.initialGrams) : '1000');
  const [remaining, setRemaining] = useState(spool ? String(spool.remainingGrams) : '');
  const [cost, setCost] = useState(spool ? String(spool.costPerKg) : '');
  const [printerId, setPrinterId] = useState(spool?.printerId ? String(spool.printerId) : '');
  const [saving, setSaving] = useState(false);
  const n = (v: string) => Number(v.replace(',', '.'));

  const save = async () => {
    const body: SpoolRequest = {
      material,
      color: color.trim() || undefined,
      brand: brand.trim() || undefined,
      initialGrams: n(initial),
      remainingGrams: remaining.trim() ? n(remaining) : undefined,
      costPerKg: n(cost),
      printerId: printerId ? Number(printerId) : undefined,
    };
    if (!(body.initialGrams > 0) || !(body.costPerKg >= 0) || cost.trim() === '') {
      showToast('Completá los gramos iniciales y el costo por kg.', { type: 'error' });
      return;
    }
    setSaving(true);
    try {
      if (spool) await spoolService.update(spool.id, body);
      else await spoolService.create(body);
      onSaved();
    } catch (e) {
      showToast(apiErrorMessage(e, 'No se pudo guardar la bobina.'), { type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={spool ? 'Editar bobina' : 'Nueva bobina'}
      footer={
        <div className={styles.modalActions}>
          <Button title="Cancelar" variant="ghost" fullWidth={false} onPress={onClose} />
          <Button title="Guardar" fullWidth={false} loading={saving} onPress={() => void save()} />
        </div>
      }
    >
      <div className={styles.form}>
        <label className={styles.select}>
          <span>Material</span>
          <select value={material} onChange={(e) => setMaterial(e.target.value as FilamentType)}>
            {FILAMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <div className={styles.pair}>
          <TextField label="Color" value={color} onChangeText={setColor} placeholder="Negro" />
          <TextField label="Marca" value={brand} onChangeText={setBrand} placeholder="Grilon3" />
        </div>
        <div className={styles.pair}>
          <TextField label="Gramos iniciales" inputMode="decimal" value={initial} onChangeText={setInitial} suffix="g" />
          <TextField label="Gramos restantes" inputMode="decimal" value={remaining} onChangeText={setRemaining} suffix="g"
            hint={spool ? undefined : 'Vacío = bobina nueva'} />
        </div>
        <TextField label="Costo por kg" inputMode="decimal" value={cost} onChangeText={setCost} suffix="$/kg" />
        <label className={styles.select}>
          <span>Cargada en</span>
          <select value={printerId} onChange={(e) => setPrinterId(e.target.value)}>
            <option value="">Ninguna</option>
            {printers.map((p) => <option key={p.id} value={p.id}>{p.name || p.model}</option>)}
          </select>
        </label>
      </div>
    </Modal>
  );
}
