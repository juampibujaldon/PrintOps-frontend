// src/screens/WorkshopCanvasScreen.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, List, Pencil, Plus } from 'lucide-react';
import { Colors } from '../constants/theme';
import { PRINTER_STATUS, daysUntilMaintenance } from '../constants/printers';
import { canvasService } from '../services/canvasService';
import type { CanvasLayout } from '../services/canvasService';
import { printerService } from '../services/printerService';
import type { PrinterResponse } from '../services/printerService';
import { orderService } from '../services/orderService';
import type { OrderStatus } from '../services/orderService';
import { Button, EmptyState, ErrorState, Modal, PressableScale, ScreenHeader, Skeleton } from '../components/ui';
import WorkshopCanvas from '../components/canvas/WorkshopCanvas';
import WorkshopSummary from '../components/canvas/WorkshopSummary';
import type { WorkshopCounts, WorkshopFilter } from '../components/canvas/WorkshopSummary';
import PrinterQuickSheet from '../components/canvas/PrinterQuickSheet';
import { useAlert } from '../context/ConfirmContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../hooks/useAuth';
import { parseCanvasLayout } from '../utils/canvas';
import { cx } from '../utils/cx';
import styles from './WorkshopCanvasScreen.module.css';

const OPEN_ORDER_STATUSES: OrderStatus[] = ['PENDING', 'IN_PROGRESS', 'IN_REVIEW'];
const EMPTY_LAYOUT: CanvasLayout = { nodes: [], edges: [] };

const isMaintenanceDue = (p: PrinterResponse) => {
  const days = daysUntilMaintenance(p.nextMaintenanceDate);
  return days != null && days <= 7;
};

const printerLabel = (p: PrinterResponse) => p.name || `${p.brand} ${p.model}`;

export default function WorkshopCanvasScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const alert = useAlert();
  const isManager = user?.role === 'MANAGER';
  const isTecnico = user?.role === 'TECNICO';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [viewMode, setViewMode] = useState<'canvas' | 'list'>('canvas');
  const [filter, setFilter] = useState<WorkshopFilter | null>(null);
  const [selected, setSelected] = useState<PrinterResponse | null>(null);
  const [adding, setAdding] = useState(false);

  const [printers, setPrinters] = useState<PrinterResponse[]>([]);
  const [layout, setLayout] = useState<CanvasLayout>(EMPTY_LAYOUT);
  const [openOrdersByPrinter, setOpenOrdersByPrinter] = useState<Record<number, number>>({});

  const savedLayout = useRef<CanvasLayout>(EMPTY_LAYOUT);
  const hasLoaded = useRef(false);
  const editModeRef = useRef(false);
  editModeRef.current = editMode;

  const load = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const [fetchedPrinters, fetchedLayout, orders] = await Promise.all([
        printerService.getAllPrinters(),
        canvasService.getCanvasLayout(),
        // Las órdenes son información extra: si fallan, el taller se muestra igual.
        orderService.listOrders().catch(() => []),
      ]);
      setPrinters(fetchedPrinters);
      // No pisar el plano mientras el usuario lo está editando.
      if (!editModeRef.current) {
        const parsed = parseCanvasLayout(fetchedLayout);
        setLayout(parsed);
        savedLayout.current = parsed;
      }
      const counts: Record<number, number> = {};
      orders
        .filter((o) => OPEN_ORDER_STATUSES.includes(o.status))
        .forEach((o) => {
          counts[o.printerId] = (counts[o.printerId] ?? 0) + 1;
        });
      setOpenOrdersByPrinter(counts);
      hasLoaded.current = true;
    } catch (e) {
      if (!silent) {
        const err = e as { response?: { data?: { message?: string } }; message?: string };
        setError(err.response?.data?.message || err.message || 'Error al cargar el taller');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Primera carga con skeleton; al volver a la pestaña, refresco silencioso.
  useEffect(() => {
    load(false);
    const onVisible = () => {
      if (document.visibilityState === 'visible' && hasLoaded.current) load(true);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [load]);

  const counts: WorkshopCounts = useMemo(
    () => ({
      operative: printers.filter((p) => p.status === 'OPERATIVE').length,
      maintenance: printers.filter((p) => p.status === 'MAINTENANCE').length,
      outOfService: printers.filter((p) => p.status === 'OUT_OF_SERVICE').length,
      due: printers.filter(isMaintenanceDue).length,
      openOrders: Object.values(openOrdersByPrinter).reduce((a, b) => a + b, 0),
    }),
    [printers, openOrdersByPrinter],
  );

  const printersById = useMemo(() => new Map(printers.map((p) => [p.id, p])), [printers]);

  const matchesFilter = useCallback(
    (p: PrinterResponse) => {
      switch (filter) {
        case null:
          return true;
        case 'DUE':
          return isMaintenanceDue(p);
        case 'ORDERS':
          return (openOrdersByPrinter[p.id] ?? 0) > 0;
        default:
          return p.status === filter;
      }
    },
    [filter, openOrdersByPrinter],
  );
  const isDimmed = useCallback((p: PrinterResponse) => !matchesFilter(p), [matchesFilter]);

  // Estable (lee editMode por ref) para no re-renderizar nodos memoizados.
  const handleNodeMoved = useCallback((printerId: number, x: number, y: number) => {
    if (!editModeRef.current) return;
    setLayout((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) => (n.printerId === printerId ? { ...n, x, y } : n)),
    }));
  }, []);

  const startEditing = () => {
    if (!isManager) return;
    setSelected(null);
    setFilter(null);
    setEditMode(true);
  };

  const cancelEditing = () => {
    setLayout(savedLayout.current);
    setEditMode(false);
  };

  const saveLayout = async () => {
    try {
      setSaving(true);
      const saved = parseCanvasLayout(await canvasService.updateCanvasLayout(layout));
      setLayout(saved);
      savedLayout.current = saved;
      setEditMode(false);
    } catch {
      showToast('No se pudo guardar el plano', { type: 'error', title: 'Error' });
    } finally {
      setSaving(false);
    }
  };

  const unplaced = printers.filter((p) => !layout.nodes.some((n) => n.printerId === p.id));

  const handleAddPrinter = () => {
    if (unplaced.length === 0) {
      void alert({ title: 'Sin impresoras', message: 'Todas tus impresoras ya están en el plano.' });
      return;
    }
    setAdding(true);
  };

  const placePrinter = (p: PrinterResponse) => {
    setLayout((prev) => ({ ...prev, nodes: [...prev.nodes, { printerId: p.id, x: 0.5, y: 0.5 }] }));
    setAdding(false);
  };

  const openDetail = (printer: PrinterResponse) => {
    setSelected(null);
    navigate(`/printers/${printer.id}`, { state: { printer } });
  };

  const createOrder = (printer: PrinterResponse) => {
    setSelected(null);
    navigate(`/printers/${printer.id}/orders/new`, { state: { printer } });
  };

  if (loading) {
    return (
      <>
        <ScreenHeader title="Taller" />
        <div className={styles.skeletonRow}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className={styles.skeletonCard} />
          ))}
        </div>
        <Skeleton className={styles.skeletonCanvas} />
      </>
    );
  }

  if (error) {
    return (
      <>
        <ScreenHeader title="Taller" />
        <ErrorState error={error} onRetry={() => load()} />
      </>
    );
  }

  const placedCount = layout.nodes.filter((n) => printersById.has(n.printerId)).length;
  const listPrinters = printers.filter(matchesFilter);

  return (
    <>
      <ScreenHeader
        title="Taller"
        rightContent={
          <div className={styles.viewToggle} role="group" aria-label="Vista">
            <button
              type="button"
              className={cx(styles.toggleBtn, viewMode === 'canvas' && styles.toggleActive)}
              onClick={() => setViewMode('canvas')}
              aria-pressed={viewMode === 'canvas'}
            >
              <LayoutGrid size={18} strokeWidth={2} aria-hidden="true" />
              <span className={styles.toggleLabel}>Plano</span>
            </button>
            <button
              type="button"
              className={cx(styles.toggleBtn, viewMode === 'list' && styles.toggleActive)}
              onClick={() => setViewMode('list')}
              aria-pressed={viewMode === 'list'}
              disabled={editMode}
            >
              <List size={18} strokeWidth={2} aria-hidden="true" />
              <span className={styles.toggleLabel}>Lista</span>
            </button>
          </div>
        }
      />

      {!editMode && <WorkshopSummary counts={counts} active={filter} onSelect={setFilter} />}

      {editMode && (
        <div className={styles.editBanner} role="status">
          <Pencil size={18} strokeWidth={2} aria-hidden="true" />
          <span>Modo edición: arrastrá las impresoras para ubicarlas (o usá las flechas del teclado)</span>
        </div>
      )}

      {viewMode === 'canvas' ? (
        <WorkshopCanvas
          nodes={layout.nodes}
          edges={layout.edges}
          printersById={printersById}
          openOrdersByPrinter={openOrdersByPrinter}
          editMode={editMode}
          isDimmed={isDimmed}
          onNodeMoved={handleNodeMoved}
          onSelect={setSelected}
          overlay={
            placedCount === 0 ? (
              <EmptyState
                icon={<LayoutGrid color={Colors.textTertiary} size={40} strokeWidth={1.5} />}
                title="El plano está vacío"
                description={
                  isManager
                    ? 'Tocá "Editar plano" y agregá tus impresoras para armar el mapa del taller.'
                    : 'Un administrador todavía no ubicó las impresoras en el plano.'
                }
              />
            ) : null
          }
        />
      ) : listPrinters.length === 0 ? (
        <EmptyState
          title="Sin impresoras"
          description={filter ? 'Ninguna impresora coincide con el filtro.' : 'Todavía no hay impresoras registradas.'}
        />
      ) : (
        <ul className={styles.list}>
          {listPrinters.map((p) => {
            const status = PRINTER_STATUS[p.status] ?? { label: 'Sin estado', color: Colors.statusUnknown };
            const orders = openOrdersByPrinter[p.id] ?? 0;
            const subtitle =
              [p.location, orders > 0 ? `${orders} ${orders === 1 ? 'orden abierta' : 'órdenes abiertas'}` : null]
                .filter(Boolean)
                .join(' · ') || p.serialNumber;
            return (
              <li key={p.id}>
                <PressableScale
                  className={styles.listItem}
                  onPress={() => setSelected(p)}
                  aria-label={`Impresora ${p.name || p.model}, estado: ${status.label}`}
                >
                  <span className={styles.listStatusBar} style={{ backgroundColor: status.color }} />
                  <span className={styles.listText}>
                    <span className={styles.listTitle}>{printerLabel(p)}</span>
                    <span className={styles.listSubtitle}>{subtitle}</span>
                  </span>
                  <span className={styles.listStatusText} style={{ color: status.color }}>
                    {status.label}
                  </span>
                </PressableScale>
              </li>
            );
          })}
        </ul>
      )}

      {isManager && viewMode === 'canvas' && (
        <div className={styles.toolbar}>
          {editMode ? (
            <>
              <Button title="Cancelar" variant="ghost" fullWidth={false} onPress={cancelEditing} disabled={saving} />
              <span className={styles.spacer} />
              <Button
                title="Agregar"
                variant="tinted"
                fullWidth={false}
                icon={<Plus size={18} strokeWidth={2.25} />}
                onPress={handleAddPrinter}
              />
              <Button title={saving ? 'Guardando…' : 'Guardar'} fullWidth={false} onPress={saveLayout} loading={saving} />
            </>
          ) : (
            <Button
              title="Editar plano"
              variant="tinted"
              fullWidth={false}
              icon={<Pencil size={18} strokeWidth={2} />}
              onPress={startEditing}
            />
          )}
        </div>
      )}

      <PrinterQuickSheet
        printer={selected}
        openOrders={selected ? (openOrdersByPrinter[selected.id] ?? 0) : 0}
        canCreateOrder={isTecnico}
        onClose={() => setSelected(null)}
        onOpenDetail={openDetail}
        onCreateOrder={createOrder}
      />

      <Modal open={adding} onClose={() => setAdding(false)} size="sm" title="Agregar impresora">
        <p className={styles.addHint}>Elegí la impresora a ubicar en el plano</p>
        <ul className={styles.addList}>
          {unplaced.map((p) => (
            <li key={p.id}>
              <button type="button" className={styles.addItem} onClick={() => placePrinter(p)}>
                {printerLabel(p)}
              </button>
            </li>
          ))}
        </ul>
      </Modal>
    </>
  );
}
