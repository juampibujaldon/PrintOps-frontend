// src/screens/PurchasingScreen.tsx — /purchasing (supervisor)
// Órdenes de compra a proveedores y agenda de proveedores. "Sugerir" arma borradores con todo
// lo que está en stock bajo; al recibir una orden se suma el stock de cada repuesto.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { PackageCheck, Pencil, Plus, Send, Sparkles, Trash2, Truck, X } from 'lucide-react';
import { Badge, Button, Card, EmptyState, ErrorState, IconButton, Modal, ScreenHeader, SegmentedControl, Skeleton, TextField } from '../components/ui';
import { useConfirm } from '../context/ConfirmContext';
import { useToast } from '../context/ToastContext';
import { apiErrorMessage } from '../services/authService';
import { partService } from '../services/partService';
import { supplierService } from '../services/supplierService';
import type { PurchaseOrder, PurchaseOrderStatus, Supplier, SupplierInput } from '../api/types';
import type { SparePartDTO } from '../types/parts';
import styles from './FeatureScreens.module.css';

const STATUS: Record<PurchaseOrderStatus, { label: string; color: string }> = {
  DRAFT: { label: 'Borrador', color: '#8E8E93' },
  SENT: { label: 'Enviada', color: '#0A84FF' },
  RECEIVED: { label: 'Recibida', color: '#34C759' },
  CANCELLED: { label: 'Cancelada', color: '#AEAEB2' },
};
const money = (v: number) => `$ ${v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('es-AR') : '');

type Tab = 'orders' | 'suppliers';

export default function PurchasingScreen() {
  const confirm = useConfirm();
  const { showToast } = useToast();
  const [tab, setTab] = useState<Tab>('orders');
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [parts, setParts] = useState<SparePartDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | 'new' | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | 'new' | null>(null);

  const load = useCallback(async () => {
    try {
      const [o, s, p] = await Promise.all([supplierService.orders(), supplierService.list(), partService.listParts()]);
      setOrders(o);
      setSuppliers(s);
      setParts(p);
      setError(null);
    } catch (e) {
      setError(apiErrorMessage(e, 'No se pudieron cargar las compras.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const lowStock = useMemo(() => parts.filter((p) => p.isLowStock).length, [parts]);

  const act = async (key: string, fn: () => Promise<unknown>, ok?: string) => {
    setBusy(key);
    try {
      await fn();
      if (ok) showToast(ok, { type: 'success' });
      await load();
    } catch (e) {
      showToast(apiErrorMessage(e, 'No se pudo completar la acción.'), { type: 'error' });
    } finally {
      setBusy(null);
    }
  };

  const suggest = () =>
    act('suggest', async () => {
      const created = await supplierService.suggest();
      showToast(
        created.length ? `Se armaron ${created.length} borrador${created.length > 1 ? 'es' : ''} con el stock bajo.` : 'No hay repuestos en stock bajo sin pedir.',
        { type: created.length ? 'success' : 'info' },
      );
    });

  const orderCard = (o: PurchaseOrder) => {
    const st = STATUS[o.status as PurchaseOrderStatus];
    return (
      <Card key={o.id} className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <h3 className={styles.cardTitle}>{o.number}</h3>
            <p className={styles.cardSub}>{o.supplierName ?? 'Sin proveedor'} · {date(o.createdAt)}</p>
          </div>
          <Badge label={st.label} color={st.color} />
        </div>
        <ul className={styles.meta} style={{ flexDirection: 'column', listStyle: 'none', padding: 0 }}>
          {o.lines.map((l) => (
            <li key={l.id}>
              {l.quantity} × {l.partName} <span className={styles.muted}>({l.partNumber})</span>
              {l.unitCost != null ? ` · ${money(l.unitCost)}` : ''}
            </li>
          ))}
        </ul>
        <p className={styles.live}>
          <span>{o.lines.length} repuesto{o.lines.length !== 1 ? 's' : ''}</span>
          <strong>{money(o.total)}</strong>
        </p>
        {o.notes && <p className={styles.hint}>{o.notes}</p>}
        <div className={styles.actions}>
          {o.status === 'DRAFT' && (
            <>
              <Button title={o.supplierEmail ? 'Enviar por email' : 'Marcar enviada'} size="sm" fullWidth={false} icon={<Send size={15} aria-hidden="true" />}
                loading={busy === `send-${o.id}`} onPress={() => void act(`send-${o.id}`, () => supplierService.send(o.id), 'Orden enviada.')} />
              <Button title="Editar" size="sm" variant="secondary" fullWidth={false} icon={<Pencil size={15} aria-hidden="true" />} onPress={() => setEditingOrder(o)} />
            </>
          )}
          {(o.status === 'SENT' || o.status === 'DRAFT') && (
            <Button title="Recibida" size="sm" variant="tinted" fullWidth={false} icon={<PackageCheck size={15} aria-hidden="true" />}
              loading={busy === `recv-${o.id}`}
              onPress={async () => {
                if (await confirm({ title: 'Recibir orden', message: `Se suma al stock lo pedido en ${o.number}.`, confirmLabel: 'Recibir' })) {
                  void act(`recv-${o.id}`, () => supplierService.receive(o.id), 'Stock actualizado.');
                }
              }} />
          )}
          {(o.status === 'SENT' || o.status === 'DRAFT') && (
            <Button title="Cancelar" size="sm" variant="ghost" fullWidth={false} icon={<X size={15} aria-hidden="true" />}
              onPress={() => void act(`cancel-${o.id}`, () => supplierService.cancel(o.id))} />
          )}
          {(o.status === 'DRAFT' || o.status === 'CANCELLED') && (
            <IconButton icon={<Trash2 size={16} aria-hidden="true" />} label={`Eliminar ${o.number}`} variant="danger" size="sm"
              onPress={async () => {
                if (await confirm({ title: 'Eliminar orden', message: `¿Eliminar ${o.number}?`, confirmLabel: 'Eliminar', destructive: true })) {
                  void act(`del-${o.id}`, () => supplierService.removeOrder(o.id));
                }
              }} />
          )}
        </div>
      </Card>
    );
  };

  return (
    <>
      <ScreenHeader
        title="Compras"
        subtitle={lowStock ? `${lowStock} repuesto${lowStock > 1 ? 's' : ''} en stock bajo` : 'Proveedores y órdenes de compra'}
        rightContent={
          tab === 'orders' ? (
            <Button title="Nueva orden" size="sm" fullWidth={false} icon={<Plus size={16} aria-hidden="true" />} onPress={() => setEditingOrder('new')} />
          ) : (
            <Button title="Nuevo proveedor" size="sm" fullWidth={false} icon={<Plus size={16} aria-hidden="true" />} onPress={() => setEditingSupplier('new')} />
          )
        }
      />
      <div className={styles.toolbar}>
        <SegmentedControl<Tab>
          ariaLabel="Sección"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'orders', label: 'Órdenes de compra' },
            { value: 'suppliers', label: 'Proveedores' },
          ]}
        />
        {tab === 'orders' && (
          <Button title="Sugerir por stock bajo" variant="tinted" size="sm" fullWidth={false} icon={<Sparkles size={16} aria-hidden="true" />}
            loading={busy === 'suggest'} onPress={() => void suggest()} />
        )}
      </div>

      {loading ? (
        <div className={styles.grid}>{[0, 1, 2].map((i) => <Skeleton key={i} height={160} />)}</div>
      ) : error ? (
        <ErrorState error={error} onRetry={() => void load()} />
      ) : tab === 'orders' ? (
        orders.length === 0 ? (
          <EmptyState icon={<Truck size={44} strokeWidth={1.5} />} title="Sin órdenes de compra"
            description="Armá una a mano o usá «Sugerir por stock bajo» para pedir todo lo que está por agotarse." />
        ) : (
          <div className={styles.grid}>{orders.map(orderCard)}</div>
        )
      ) : suppliers.length === 0 ? (
        <EmptyState icon={<Truck size={44} strokeWidth={1.5} />} title="Sin proveedores"
          description="Cargá a quién le comprás repuestos. Asigná el proveedor de cada repuesto desde el detalle del repuesto o al armar una orden." />
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Proveedor</th>
                <th>Email</th>
                <th>Teléfono</th>
                <th>Web</th>
                <th className={styles.num}>Repuestos</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s.id}>
                  <td><strong>{s.name}</strong>{s.notes ? <div className={styles.muted}>{s.notes}</div> : null}</td>
                  <td>{s.email ? <a href={`mailto:${s.email}`}>{s.email}</a> : '—'}</td>
                  <td>{s.phone ?? '—'}</td>
                  <td>{s.website && /^https?:\/\//.test(s.website) ? <a href={s.website} target="_blank" rel="noopener noreferrer">Abrir</a> : '—'}</td>
                  <td className={styles.num}>{parts.filter((p) => p.supplierId === s.id).length}</td>
                  <td className={styles.num}>
                    <IconButton icon={<Pencil size={16} aria-hidden="true" />} label={`Editar ${s.name}`} size="sm" onPress={() => setEditingSupplier(s)} />
                    <IconButton icon={<Trash2 size={16} aria-hidden="true" />} label={`Eliminar ${s.name}`} size="sm" variant="danger"
                      onPress={async () => {
                        if (await confirm({ title: 'Eliminar proveedor', message: `¿Eliminar a ${s.name}? Sus repuestos quedan sin proveedor.`, confirmLabel: 'Eliminar', destructive: true })) {
                          void act(`delsup-${s.id}`, () => supplierService.remove(s.id));
                        }
                      }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editingOrder && (
        <OrderModal
          order={editingOrder === 'new' ? null : editingOrder}
          suppliers={suppliers}
          parts={parts}
          onClose={() => setEditingOrder(null)}
          onSaved={() => {
            setEditingOrder(null);
            void load();
          }}
        />
      )}
      {editingSupplier && (
        <SupplierModal
          supplier={editingSupplier === 'new' ? null : editingSupplier}
          onClose={() => setEditingSupplier(null)}
          onSaved={() => {
            setEditingSupplier(null);
            void load();
          }}
        />
      )}
    </>
  );
}

interface LineDraft {
  key: number;
  partId: string;
  quantity: string;
  unitCost: string;
}

function OrderModal({ order, suppliers, parts, onClose, onSaved }: {
  order: PurchaseOrder | null;
  suppliers: Supplier[];
  parts: SparePartDTO[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { showToast } = useToast();
  const [supplierId, setSupplierId] = useState(order?.supplierId ? String(order.supplierId) : '');
  const [notes, setNotes] = useState(order?.notes ?? '');
  const [lines, setLines] = useState<LineDraft[]>(
    order?.lines.map((l, i) => ({ key: i, partId: String(l.partId), quantity: String(l.quantity), unitCost: l.unitCost != null ? String(l.unitCost) : '' })) ?? [
      { key: 0, partId: '', quantity: '1', unitCost: '' },
    ],
  );
  const [saving, setSaving] = useState(false);
  const n = (v: string) => Number(v.replace(',', '.'));
  const update = (key: number, patch: Partial<LineDraft>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  // Filtra por el proveedor elegido (si tiene repuestos asignados) para encontrar rápido.
  const options = supplierId && parts.some((p) => p.supplierId === Number(supplierId)) ? parts.filter((p) => p.supplierId === Number(supplierId)) : parts;

  const save = async () => {
    const valid = lines.filter((l) => l.partId && n(l.quantity) >= 1);
    if (valid.length === 0) {
      showToast('Agregá al menos un repuesto con cantidad.', { type: 'error' });
      return;
    }
    const body = {
      supplierId: supplierId ? Number(supplierId) : undefined,
      notes: notes.trim() || undefined,
      lines: valid.map((l) => ({ partId: Number(l.partId), quantity: Math.round(n(l.quantity)), unitCost: l.unitCost.trim() ? n(l.unitCost) : undefined })),
    };
    setSaving(true);
    try {
      if (order) await supplierService.updateOrder(order.id, body);
      else await supplierService.createOrder(body);
      onSaved();
    } catch (e) {
      showToast(apiErrorMessage(e, 'No se pudo guardar la orden.'), { type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={order ? `Editar ${order.number}` : 'Nueva orden de compra'} size="lg"
      footer={
        <div className={styles.modalActions}>
          <Button title="Cancelar" variant="ghost" fullWidth={false} onPress={onClose} />
          <Button title="Guardar borrador" fullWidth={false} loading={saving} onPress={() => void save()} />
        </div>
      }>
      <div className={styles.form}>
        <label className={styles.select}>
          <span>Proveedor</span>
          <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            <option value="">Sin proveedor</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        {lines.map((l, i) => {
          const part = parts.find((p) => p.id === Number(l.partId));
          return (
            <div key={l.key} className={styles.pair} style={{ gridTemplateColumns: 'minmax(0, 2fr) 90px 120px auto', alignItems: 'end' }}>
              <label className={styles.select}>
                <span>Repuesto {i + 1}{part ? ` · stock ${part.stock} (mín. ${part.minStock})` : ''}</span>
                <select value={l.partId} onChange={(e) => {
                  const p = parts.find((x) => x.id === Number(e.target.value));
                  update(l.key, { partId: e.target.value, unitCost: l.unitCost || (p?.unitPrice ? String(p.unitPrice) : '') });
                }}>
                  <option value="">Elegí un repuesto</option>
                  {options.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.partNumber}){p.isLowStock ? ' ⚠' : ''}</option>)}
                </select>
              </label>
              <TextField label="Cantidad" inputMode="numeric" value={l.quantity} onChangeText={(v) => update(l.key, { quantity: v })} />
              <TextField label="Costo unit." inputMode="decimal" value={l.unitCost} onChangeText={(v) => update(l.key, { unitCost: v })} />
              <IconButton icon={<Trash2 size={16} aria-hidden="true" />} label={`Quitar repuesto ${i + 1}`} variant="danger" size="sm"
                onPress={() => setLines((ls) => (ls.length > 1 ? ls.filter((x) => x.key !== l.key) : ls))} />
            </div>
          );
        })}
        <Button title="Agregar repuesto" variant="tinted" size="sm" fullWidth={false} icon={<Plus size={15} aria-hidden="true" />}
          onPress={() => setLines((ls) => [...ls, { key: Date.now(), partId: '', quantity: '1', unitCost: '' }])} />
        <TextField multiline label="Notas para el proveedor" value={notes} onChangeText={setNotes} />
      </div>
    </Modal>
  );
}

function SupplierModal({ supplier, onClose, onSaved }: { supplier: Supplier | null; onClose: () => void; onSaved: () => void }) {
  const { showToast } = useToast();
  const [form, setForm] = useState<SupplierInput>({
    name: supplier?.name ?? '',
    email: supplier?.email ?? '',
    phone: supplier?.phone ?? '',
    website: supplier?.website ?? '',
    notes: supplier?.notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof SupplierInput) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.name.trim()) {
      showToast('El nombre es obligatorio.', { type: 'error' });
      return;
    }
    const body = { ...form, email: form.email?.trim() || undefined };
    setSaving(true);
    try {
      if (supplier) await supplierService.update(supplier.id, body);
      else await supplierService.create(body);
      onSaved();
    } catch (e) {
      showToast(apiErrorMessage(e, 'No se pudo guardar el proveedor.'), { type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={supplier ? 'Editar proveedor' : 'Nuevo proveedor'}
      footer={
        <div className={styles.modalActions}>
          <Button title="Cancelar" variant="ghost" fullWidth={false} onPress={onClose} />
          <Button title="Guardar" fullWidth={false} loading={saving} onPress={() => void save()} />
        </div>
      }>
      <div className={styles.form}>
        <TextField label="Nombre" value={form.name} onChangeText={set('name')} data-autofocus />
        <div className={styles.pair}>
          <TextField label="Email" type="email" value={form.email ?? ''} onChangeText={set('email')} hint="Para mandarle las órdenes" />
          <TextField label="Teléfono" value={form.phone ?? ''} onChangeText={set('phone')} />
        </div>
        <TextField label="Web" value={form.website ?? ''} onChangeText={set('website')} placeholder="https://" />
        <TextField multiline label="Notas" value={form.notes ?? ''} onChangeText={set('notes')} />
      </div>
    </Modal>
  );
}
