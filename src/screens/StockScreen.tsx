// src/screens/StockScreen.tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, Search } from 'lucide-react';
import { Button, Chip, EmptyState, ErrorState, Modal, ScreenHeader, Skeleton, TextField } from '../components/ui';
import SparePartCard from '../components/SparePartCard';
import CreateSparePartBottomSheet from '../components/CreateSparePartBottomSheet';
import StockAdjustmentModal from '../components/StockAdjustmentModal';
import { useConfirm } from '../context/ConfirmContext';
import { useToast } from '../context/ToastContext';
import { apiErrorMessage } from '../services/authService';
import { partService } from '../services/partService';
import type { SparePartDTO } from '../types/parts';
import { cx } from '../utils/cx';
import styles from './StockScreen.module.css';

// Inventario de repuestos (US-10). Accesible desde el menú lateral.
export default function StockScreen() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { showToast } = useToast();

  const [parts, setParts] = useState<SparePartDTO[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [lowStock, setLowStock] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sheet, setSheet] = useState<{ open: boolean; mode: 'create' | 'edit'; part: SparePartDTO | null }>({
    open: false,
    mode: 'create',
    part: null,
  });
  const [adjustPart, setAdjustPart] = useState<SparePartDTO | null>(null);
  const [menuPart, setMenuPart] = useState<SparePartDTO | null>(null);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    try {
      setError(null);
      const [p, c] = await Promise.all([
        partService.listParts({ search: search || undefined, category: category || undefined, lowStock }),
        partService.getCategories(),
      ]);
      if (id !== requestId.current) return;
      setParts(p);
      setCategories(c);
    } catch {
      if (id !== requestId.current) return;
      setError('No se pudo cargar el inventario.');
    } finally {
      if (id === requestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [search, category, lowStock]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    void load();
  };

  const goDetail = (part: SparePartDTO) => navigate(`/parts/${part.id}`, { state: { part } });

  const removePart = async (part: SparePartDTO) => {
    const ok = await confirm({
      title: 'Eliminar',
      message: `¿Eliminar "${part.name}"?`,
      confirmLabel: 'Eliminar',
      destructive: true,
    });
    if (!ok) return;
    try {
      await partService.deletePart(part.id);
      setParts((prev) => prev.filter((p) => p.id !== part.id));
    } catch (e) {
      showToast(apiErrorMessage(e, 'No se pudo eliminar la pieza.'), { type: 'error', title: 'Error' });
    }
  };

  const onSaved = (saved: SparePartDTO) => {
    setParts((prev) => {
      const exists = prev.some((p) => p.id === saved.id);
      return exists ? prev.map((p) => (p.id === saved.id ? saved : p)) : [saved, ...prev];
    });
  };

  const onAdjusted = (saved: SparePartDTO) => {
    setParts((prev) => prev.map((p) => (p.id === saved.id ? saved : p)));
  };

  // Cierra el menú y ejecuta la acción elegida sobre la pieza.
  const fromMenu = (action: (part: SparePartDTO) => void) => () => {
    const part = menuPart;
    setMenuPart(null);
    if (part) action(part);
  };

  const hasFilters = !!(search || category || lowStock);

  let body;
  if (loading) {
    body = (
      <div className={styles.list} aria-busy="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} height={110} className={styles.skeleton} />
        ))}
      </div>
    );
  } else if (error && parts.length === 0) {
    body = (
      <ErrorState
        error={error}
        onRetry={() => {
          setLoading(true);
          void load();
        }}
      />
    );
  } else if (parts.length === 0) {
    body = (
      <EmptyState
        title={hasFilters ? 'No encontramos piezas que coincidan' : 'No hay repuestos registrados'}
        description={hasFilters ? 'Probá con otros filtros.' : 'Agregá el primero con el botón "Nuevo repuesto".'}
      />
    );
  } else {
    body = (
      <ul className={styles.list}>
        {parts.map((part) => (
          <li key={part.id}>
            <SparePartCard part={part} onPress={() => goDetail(part)} onMenuPress={() => setMenuPart(part)} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <>
      <ScreenHeader
        title="Repuestos"
        rightContent={
          <>
            <Button
              title="Actualizar"
              variant="tinted"
              size="sm"
              fullWidth={false}
              icon={<RefreshCw size={16} aria-hidden="true" />}
              loading={refreshing}
              onPress={onRefresh}
            />
            <Button
              title="Nuevo repuesto"
              size="sm"
              fullWidth={false}
              icon={<Plus size={16} aria-hidden="true" />}
              onPress={() => setSheet({ open: true, mode: 'create', part: null })}
            />
          </>
        }
      />

      <div className={styles.filters}>
        <TextField
          type="search"
          aria-label="Buscar repuestos"
          placeholder="Buscar por nombre o N° parte"
          value={search}
          onChangeText={setSearch}
          suffix={<Search size={16} aria-hidden="true" />}
        />

        <div className={styles.chipRow}>
          <Chip label="Todos" selected={category === null} onPress={() => setCategory(null)} />
          {categories.map((c) => (
            <Chip key={c} label={c} selected={category === c} onPress={() => setCategory(c)} />
          ))}
        </div>

        <button
          type="button"
          className={cx(styles.lowChip, lowStock && styles.lowChipActive)}
          aria-pressed={lowStock}
          onClick={() => setLowStock((v) => !v)}
        >
          Solo stock bajo
        </button>
      </div>

      {body}

      <Modal open={menuPart !== null} onClose={() => setMenuPart(null)} title={menuPart?.name} size="sm">
        <p className={styles.menuHint}>¿Qué deseás hacer?</p>
        <div className={styles.menu}>
          <Button title="Editar" variant="secondary" onPress={fromMenu((part) => setSheet({ open: true, mode: 'edit', part }))} />
          <Button title="Ajustar stock" variant="secondary" onPress={fromMenu((part) => setAdjustPart(part))} />
          <Button title="Ver movimientos" variant="secondary" onPress={fromMenu(goDetail)} />
          <Button title="Eliminar" variant="danger" onPress={fromMenu((part) => void removePart(part))} />
        </div>
      </Modal>

      <CreateSparePartBottomSheet
        visible={sheet.open}
        mode={sheet.mode}
        part={sheet.part}
        onClose={() => setSheet((s) => ({ ...s, open: false }))}
        onSaved={onSaved}
      />

      <StockAdjustmentModal
        visible={adjustPart !== null}
        part={adjustPart}
        onClose={() => setAdjustPart(null)}
        onAdjusted={onAdjusted}
      />
    </>
  );
}
