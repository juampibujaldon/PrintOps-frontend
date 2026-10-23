// src/screens/SparePartDetailScreen.tsx
import { useCallback, useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { ArrowUpRight, RefreshCw } from 'lucide-react';
import { Badge, Button, Card, EmptyState, ErrorState, ScreenHeader, Skeleton } from '../components/ui';
import StockAdjustmentModal from '../components/StockAdjustmentModal';
import { Colors } from '../constants/theme';
import { partService } from '../services/partService';
import SupplierPicker from '../components/SupplierPicker';
import { useAuth } from '../hooks/useAuth';
import type { MovementType, SparePartDTO, StockMovementDTO } from '../types/parts';
import { safeHttpUrl } from '../utils/url';
import styles from './SparePartDetailScreen.module.css';

const MOVEMENT_META: Record<MovementType, { label: string; color: string }> = {
  PURCHASE: { label: 'Compra', color: '#34C759' },
  ORDER_USE: { label: 'Uso en orden', color: '#FF9500' },
  ADJUSTMENT: { label: 'Ajuste', color: '#5856D6' },
  RETURN: { label: 'Devolución', color: '#007AFF' },
};

export default function SparePartDetailScreen() {
  const { partId: partIdParam } = useParams<{ partId: string }>();
  const partId = Number(partIdParam);
  const location = useLocation();
  // Optimización: pintar al instante con la pieza recibida desde el listado.
  const statePart = (location.state as { part?: SparePartDTO } | null)?.part;

  const [part, setPart] = useState<SparePartDTO | null>(statePart?.id === partId ? statePart : null);
  const { user } = useAuth();
  const [movements, setMovements] = useState<StockMovementDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adjustType, setAdjustType] = useState<MovementType | null>(null);

  const load = useCallback(async () => {
    if (!Number.isFinite(partId)) {
      setError('No se pudo cargar la pieza.');
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const [p, m] = await Promise.all([partService.getPart(partId), partService.getMovements(partId)]);
      setPart(p);
      setMovements(m);
    } catch {
      setError('No se pudo cargar la pieza.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [partId]);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    void load();
  };

  const onAdjusted = (saved: SparePartDTO) => {
    setPart(saved);
    void load();
  };

  const header = (
    <ScreenHeader
      title={part?.name ?? 'Repuesto'}
      subtitle={part?.partNumber}
      backTo="/parts"
      rightContent={
        part ? (
          <Button
            title="Actualizar"
            variant="tinted"
            size="sm"
            fullWidth={false}
            icon={<RefreshCw size={16} aria-hidden="true" />}
            loading={refreshing}
            onPress={onRefresh}
          />
        ) : undefined
      }
    />
  );

  if (loading && !part) {
    return (
      <>
        {header}
        <div className={styles.skeletons} aria-busy="true">
          <Skeleton height={160} className={styles.skeleton} />
          <Skeleton height={220} className={styles.skeleton} />
        </div>
      </>
    );
  }

  if (error || !part) {
    return (
      <>
        {header}
        <ErrorState
          error={error ?? 'No se pudo cargar la pieza.'}
          onRetry={() => {
            setLoading(true);
            void load();
          }}
        />
      </>
    );
  }

  const supplierUrl = safeHttpUrl(part.supplierUrl);

  return (
    <>
      {header}
      <div className={styles.layout}>
        <div className={styles.side}>
          <div className={styles.info}>
            {part.category ? <span className={styles.categoryChip}>{part.category}</span> : null}
            {part.brand ? <span className={styles.brand}>{part.brand}</span> : null}
            {supplierUrl ? (
              <a className={styles.supplier} href={supplierUrl} target="_blank" rel="noopener noreferrer">
                Ver proveedor
                <ArrowUpRight size={14} aria-hidden="true" />
              </a>
            ) : null}
          </div>

          {user?.role === 'MANAGER' && <SupplierPicker part={part} onChange={setPart} />}

          <Card className={styles.stockPanel}>
            <p className={styles.stockBig}>{part.stock}</p>
            <p className={styles.stockLabel}>en stock · mínimo {part.minStock}</p>
            <p className={styles.price}>${part.unitPrice.toFixed(2)} / unidad</p>
            <div className={styles.stockActions}>
              <Button title="Entrada" variant="secondary" onPress={() => setAdjustType('PURCHASE')} />
              <Button title="Ajuste [~]" variant="secondary" onPress={() => setAdjustType('ADJUSTMENT')} />
            </div>
          </Card>
        </div>

        <section className={styles.movements} aria-labelledby="mov-title">
          <h2 id="mov-title" className={styles.movTitle}>
            Historial de movimientos
          </h2>
          {movements.length === 0 ? (
            <EmptyState title="Sin movimientos registrados" />
          ) : (
            <ul className={styles.movementList}>
              {movements.map((item) => {
                const meta = MOVEMENT_META[item.type] ?? { label: item.type, color: Colors.textTertiary };
                const positive = item.quantityChange >= 0;
                return (
                  <li key={item.id} className={styles.movementRow}>
                    <Badge label={meta.label} color={meta.color} />
                    <div className={styles.movementInfo}>
                      <p className={styles.movementQty}>
                        <span className={positive ? styles.qtyIn : styles.qtyOut}>
                          {positive ? `+${item.quantityChange}` : item.quantityChange}
                        </span>{' '}
                        · {item.quantityBefore} → {item.quantityAfter}
                      </p>
                      {item.note ? <p className={styles.movementNote}>{item.note}</p> : null}
                      <p className={styles.movementMeta}>
                        {item.performedByName ? `${item.performedByName} · ` : ''}
                        {new Date(item.performedAt).toLocaleString('es-AR')}
                        {item.orderNumber ? ` · ${item.orderNumber}` : ''}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <StockAdjustmentModal
        visible={adjustType !== null}
        part={part}
        initialType={adjustType ?? 'PURCHASE'}
        onClose={() => setAdjustType(null)}
        onAdjusted={onAdjusted}
      />
    </>
  );
}
