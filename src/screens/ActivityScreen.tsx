// src/screens/ActivityScreen.tsx — /activity (supervisor)
// Registro de actividad del taller: cambios de estado de órdenes, movimientos de stock,
// accesos y trabajos de impresión, del más reciente al más viejo.
import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, KeyRound, ListOrdered, LogIn, LogOut, Package, ShieldAlert } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button, Chip, EmptyState, ErrorState, ScreenHeader, Skeleton } from '../components/ui';
import { usePagedList } from '../hooks/usePagedList';
import { analyticsService } from '../services/analyticsService';
import { apiErrorMessage } from '../services/authService';
import type { ActivityItem } from '../api/types';
import styles from './ActivityScreen.module.css';

const KINDS: Record<string, { label: string; icon: LucideIcon; color: string }> = {
  ORDER_STATUS: { label: 'Órdenes', icon: ClipboardList, color: 'var(--color-primary)' },
  STOCK: { label: 'Stock', icon: Package, color: 'var(--color-orange)' },
  JOB: { label: 'Trabajos', icon: ListOrdered, color: 'var(--color-green)' },
  LOGIN: { label: 'Ingresos', icon: LogIn, color: 'var(--color-gray)' },
  LOGOUT: { label: 'Salidas', icon: LogOut, color: 'var(--color-gray)' },
  LOGIN_FAILED: { label: 'Intentos fallidos', icon: ShieldAlert, color: 'var(--color-red)' },
};

const FILTERS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Todo' },
  ...Object.entries(KINDS).map(([value, k]) => ({ value, label: k.label })),
];

function refLink(item: ActivityItem) {
  if (item.refId == null) return item.ref;
  if (item.kind === 'ORDER_STATUS') return <Link to={`/orders/${item.refId}`}>{item.ref}</Link>;
  if (item.kind === 'STOCK') return <Link to={`/parts/${item.refId}`}>{item.ref}</Link>;
  if (item.kind === 'JOB') return <Link to="/jobs">{item.ref}</Link>;
  return item.ref;
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Hoy';
  if (d.toDateString() === yesterday.toDateString()) return 'Ayer';
  return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
}

export default function ActivityScreen() {
  const [kind, setKind] = useState('');
  const fetchPage = useCallback((page: number) => analyticsService.activity(page, kind, 40), [kind]);
  const { items, total, loading, loadingMore, hasMore, error, reload, loadMore } = usePagedList<ActivityItem>(fetchPage);

  let lastDay = '';
  return (
    <>
      <ScreenHeader title="Actividad" subtitle={total ? `${total} eventos` : 'Quién hizo qué y cuándo'} />
      <div className={styles.filters} role="group" aria-label="Filtrar por tipo">
        {FILTERS.map((f) => (
          <Chip key={f.value || 'all'} label={f.label} selected={kind === f.value} onPress={() => setKind(f.value)} />
        ))}
      </div>

      {loading ? (
        <div className={styles.list}>{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} height={56} />)}</div>
      ) : error ? (
        <ErrorState error={apiErrorMessage(error, 'No se pudo cargar la actividad.')} onRetry={() => void reload()} />
      ) : items.length === 0 ? (
        <EmptyState icon={<KeyRound size={44} strokeWidth={1.5} />} title="Sin actividad" description="Todavía no hay eventos de este tipo." />
      ) : (
        <ol className={styles.list}>
          {items.map((item, i) => {
            const k = KINDS[item.kind] ?? KINDS.ORDER_STATUS;
            const Icon = k.icon;
            const day = item.at ? dayLabel(item.at) : '';
            const header = day !== lastDay ? day : null;
            lastDay = day;
            return (
              <li key={`${item.kind}-${item.refId}-${item.at}-${i}`}>
                {header && <h2 className={styles.day}>{header}</h2>}
                <div className={styles.row}>
                  <span className={styles.icon} style={{ color: k.color }} aria-hidden="true">
                    <Icon size={18} />
                  </span>
                  <div className={styles.body}>
                    <p className={styles.main}>
                      <strong>{item.actor ?? 'Sistema'}</strong> · {refLink(item) ?? k.label}
                    </p>
                    <p className={styles.detail}>{item.detail}</p>
                  </div>
                  <time className={styles.time} dateTime={item.at ?? undefined}>
                    {item.at ? new Date(item.at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : ''}
                  </time>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      {!loading && hasMore && (
        <div className={styles.more}>
          <Button title="Cargar más" variant="secondary" fullWidth={false} loading={loadingMore} onPress={() => void loadMore()} />
        </div>
      )}
    </>
  );
}
