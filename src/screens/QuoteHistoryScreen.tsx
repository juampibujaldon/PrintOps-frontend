// src/screens/QuoteHistoryScreen.tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, FileX, Plus, RefreshCw, X } from 'lucide-react';
import { Badge, Button, Card, Chip, EmptyState, ErrorState, ScreenHeader, Skeleton, TextField } from '../components/ui';
import { Colors } from '../constants/theme';
import { useConfirm } from '../context/ConfirmContext';
import { useToast } from '../context/ToastContext';
import { apiErrorMessage } from '../services/authService';
import { quoteService } from '../services/quoteService';
import { QUOTE_STATUS_LABELS, QUOTE_TRANSITIONS } from '../types/quote';
import type { Quote, QuoteStatus } from '../types/quote';
import { cx } from '../utils/cx';
import styles from './QuoteHistoryScreen.module.css';

const money = (v: number | null | undefined) =>
  `$${(v ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });

const STATUS_FILTERS: Array<{ value: QuoteStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'Todos' },
  { value: 'DRAFT', label: 'Borrador' },
  { value: 'SENT', label: 'Enviado' },
  { value: 'ACCEPTED', label: 'Aceptado' },
  { value: 'PAID', label: 'Pagado' },
  { value: 'REJECTED', label: 'Rechazado' },
];

const getStatusColors = (status: QuoteStatus) => {
  switch (status) {
    case 'ACCEPTED':
      return { bg: Colors.successBg, text: Colors.successText };
    case 'PAID':
      return { bg: Colors.successText, text: '#FFFFFF' };
    case 'REJECTED':
      return { bg: Colors.errorBg, text: Colors.errorText };
    case 'SENT':
      return { bg: Colors.infoBg, text: Colors.infoText };
    default:
      return { bg: Colors.separator, text: Colors.textSecondary };
  }
};

// Mismas transiciones que el backend; el color sigue al estado destino.
const TRANSITION_STYLE: Record<QuoteStatus, { className: string; short: string }> = {
  DRAFT: { className: styles.actDraft, short: 'Borrador' },
  SENT: { className: styles.actSent, short: 'Enviar' },
  ACCEPTED: { className: styles.actAccepted, short: 'Aceptar' },
  REJECTED: { className: styles.actRejected, short: 'Rechazar' },
  PAID: { className: styles.actPaid, short: 'Pagado' },
};

export default function QuoteHistoryScreen() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { showToast } = useToast();

  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | 'ALL'>('ALL');
  const [clientFilter, setClientFilter] = useState('');
  const [query, setQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const requestCounter = useRef(0);
  // Ref para saber si ya hay datos sin meter `quotes` en las deps de `load`.
  const hasQuotes = useRef(false);
  hasQuotes.current = quotes.length > 0;
  const hasFilters = statusFilter !== 'ALL' || query.trim() !== '' || fromDate !== '' || toDate !== '';

  useEffect(() => {
    const timeout = setTimeout(() => setQuery(clientFilter), 400);
    return () => clearTimeout(timeout);
  }, [clientFilter]);

  const filters = useCallback(
    () => ({
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      clientName: query.trim() || undefined,
      from: fromDate || undefined,
      to: toDate || undefined,
    }),
    [statusFilter, query, fromDate, toDate],
  );

  const loadMore = async () => {
    const reqId = requestCounter.current;
    setLoadingMore(true);
    try {
      const data = await quoteService.page(page + 1, filters());
      if (reqId !== requestCounter.current) return;
      setQuotes((prev) => [...prev, ...data.content]);
      setPage(data.page);
      setHasMore(!data.last);
      setTotal(data.totalElements);
    } catch (e) {
      showToast(apiErrorMessage(e, 'No se pudieron cargar más presupuestos'), { type: 'error' });
    } finally {
      setLoadingMore(false);
    }
  };

  const load = useCallback(
    async (isRefresh = false) => {
      const reqId = ++requestCounter.current;
      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);

        const data = await quoteService.page(0, filters());
        if (reqId === requestCounter.current) {
          setQuotes(data.content);
          setPage(0);
          setHasMore(!data.last);
          setTotal(data.totalElements);
        }
      } catch (e) {
        if (reqId === requestCounter.current) {
          const msg = apiErrorMessage(e, 'No se pudieron cargar los presupuestos');
          setError(msg);
          if (hasQuotes.current) showToast(msg, { type: 'error', title: 'Error' });
        }
      } finally {
        if (reqId === requestCounter.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [filters, showToast],
  );

  // Carga al entrar y cada vez que cambian los filtros.
  useEffect(() => {
    void load();
  }, [load]);

  const onFromChange = (value: string) => {
    if (value && toDate && value > toDate) {
      showToast('La fecha "Desde" no puede ser posterior a "Hasta"', { type: 'error', title: 'Error' });
      return;
    }
    setFromDate(value);
  };

  const onToChange = (value: string) => {
    if (value && fromDate && value < fromDate) {
      showToast('La fecha "Hasta" no puede ser anterior a "Desde"', { type: 'error', title: 'Error' });
      return;
    }
    setToDate(value);
  };

  const clearFilters = () => {
    setStatusFilter('ALL');
    setClientFilter('');
    setQuery('');
    setFromDate('');
    setToDate('');
  };

  const changeStatus = async (id: number, status: QuoteStatus) => {
    setBusyId(id);
    try {
      await quoteService.updateStatus(id, status);
      await load(true);
    } catch (e) {
      showToast(apiErrorMessage(e, 'No se pudo cambiar el estado'), { type: 'error', title: 'Error' });
    } finally {
      setBusyId(null);
    }
  };

  const duplicate = async (id: number) => {
    setBusyId(id);
    try {
      const q = await quoteService.duplicate(id);
      navigate(`/quotes/${q.id}`, { state: { title: `Basado en ${q.quoteNumber}` } });
    } catch (e) {
      showToast(apiErrorMessage(e, 'No se pudo duplicar'), { type: 'error', title: 'Error' });
    } finally {
      setBusyId(null);
    }
  };

  const removeQuote = async (quote: Quote) => {
    const ok = await confirm({
      title: 'Eliminar presupuesto',
      message: `¿Eliminar el presupuesto ${quote.quoteNumber}?`,
      confirmLabel: 'Eliminar',
      destructive: true,
    });
    if (!ok) return;
    setBusyId(quote.id);
    try {
      await quoteService.remove(quote.id);
      await load(true);
    } catch (e) {
      showToast(apiErrorMessage(e, 'No se pudo eliminar'), { type: 'error', title: 'Error' });
    } finally {
      setBusyId(null);
    }
  };

  const renderActions = (quote: Quote) => {
    const disabled = busyId === quote.id;
    return (
      <div className={styles.actionsRow} role="group" aria-label={`Acciones del presupuesto ${quote.quoteNumber}`}>
        {QUOTE_TRANSITIONS[quote.status]?.map((t) => {
          const st = TRANSITION_STYLE[t.to];
          return (
            <button
              key={t.to}
              type="button"
              className={cx(styles.actionBtn, st.className)}
              disabled={disabled}
              title={t.label}
              onClick={() => void changeStatus(quote.id, t.to)}
            >
              {st.short}
            </button>
          );
        })}
        {quote.status === 'DRAFT' && (
          <button
            type="button"
            className={cx(styles.actionBtn, styles.actDelete)}
            disabled={disabled}
            onClick={() => void removeQuote(quote)}
          >
            Eliminar
          </button>
        )}
        <button type="button" className={styles.actionBtn} disabled={disabled} onClick={() => void duplicate(quote.id)}>
          Duplicar
        </button>
      </div>
    );
  };

  const renderCard = (item: Quote) => {
    const statusColors = getStatusColors(item.status);
    return (
      <Card padded={false} className={styles.card}>
        <button type="button" className={styles.cardMain} onClick={() => navigate(`/quotes/${item.id}`)}>
          <span className={styles.cardHeader}>
            <span className={styles.cardHeaderLeft}>
              <span className={styles.client}>{item.clientName || 'Sin cliente'}</span>
              <span className={styles.jobDesc}>{item.jobDescription || 'Sin descripción'}</span>
            </span>
            <span className={styles.priceBox}>
              <span className={styles.price}>{money(item.totalPrice)}</span>
              {item.units > 1 && <span className={styles.units}>{item.units} u.</span>}
            </span>
          </span>
          <span className={styles.divider} />
          <span className={styles.cardFooter}>
            <Badge
              label={QUOTE_STATUS_LABELS[item.status] ?? item.status}
              bgColor={statusColors.bg}
              textColor={statusColors.text}
            />
            <span className={styles.meta}>
              {[item.quoteNumber, item.printerName, formatDate(item.createdAt)].filter(Boolean).join(' · ')}
            </span>
          </span>
        </button>
        {renderActions(item)}
      </Card>
    );
  };

  let body;
  if (loading && quotes.length === 0 && !error) {
    body = (
      <div className={styles.list} aria-busy="true">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} height={130} className={styles.skeleton} />
        ))}
      </div>
    );
  } else if (error && quotes.length === 0) {
    body = <ErrorState error={error} onRetry={() => void load()} />;
  } else if (quotes.length === 0) {
    body = hasFilters ? (
      <EmptyState
        icon={<FileX size={48} aria-hidden="true" />}
        title="Sin resultados"
        description="Ningún presupuesto coincide con los filtros aplicados."
        action={<Button title="Limpiar filtros" variant="tinted" fullWidth={false} onPress={clearFilters} />}
      />
    ) : (
      <EmptyState
        icon={<FileX size={48} aria-hidden="true" />}
        title="Sin presupuestos"
        description='Todavía no tenés presupuestos guardados. Tocá "Nuevo presupuesto" para crear el primero.'
      />
    );
  } else {
    body = (
      <>
        <p className={styles.resultCount} aria-live="polite">
          {total} {total === 1 ? 'presupuesto' : 'presupuestos'}
        </p>
        <ul className={styles.list}>
          {quotes.map((q) => (
            <li key={q.id}>{renderCard(q)}</li>
          ))}
        </ul>
        {hasMore && (
          <div className={styles.more}>
            <Button title="Cargar más" variant="secondary" fullWidth={false} loading={loadingMore} onPress={() => void loadMore()} />
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <ScreenHeader
        title="Presupuestos"
        subtitle="Historial y seguimiento"
        rightContent={
          <>
            <Button
              title="Actualizar"
              variant="tinted"
              size="sm"
              fullWidth={false}
              icon={<RefreshCw size={16} aria-hidden="true" />}
              loading={refreshing}
              onPress={() => void load(true)}
            />
            <Button
              title="Nuevo presupuesto"
              size="sm"
              fullWidth={false}
              icon={<Plus size={16} aria-hidden="true" />}
              onPress={() => navigate('/quotes/new')}
            />
          </>
        }
      />

      <div className={styles.filters}>
        <div className={styles.chipsRow} role="group" aria-label="Filtrar por estado">
          {STATUS_FILTERS.map((f) => (
            <Chip key={f.value} label={f.label} selected={statusFilter === f.value} onPress={() => setStatusFilter(f.value)} />
          ))}
        </div>
        <div className={styles.filterRow}>
          <TextField
            type="search"
            aria-label="Buscar por cliente"
            placeholder="Buscar por cliente"
            value={clientFilter}
            onChangeText={setClientFilter}
            containerClassName={styles.search}
          />
          <div className={styles.dateRow}>
            <label className={styles.dateField}>
              <Calendar size={18} aria-hidden="true" />
              <span className={styles.dateLabel}>Desde</span>
              <input
                type="date"
                className={styles.dateInput}
                value={fromDate}
                max={toDate || undefined}
                onChange={(e) => onFromChange(e.target.value)}
              />
            </label>
            <label className={styles.dateField}>
              <Calendar size={18} aria-hidden="true" />
              <span className={styles.dateLabel}>Hasta</span>
              <input
                type="date"
                className={styles.dateInput}
                value={toDate}
                min={fromDate || undefined}
                onChange={(e) => onToChange(e.target.value)}
              />
            </label>
            {(fromDate !== '' || toDate !== '') && (
              <button
                type="button"
                className={styles.clearDateBtn}
                aria-label="Limpiar fechas"
                onClick={() => {
                  setFromDate('');
                  setToDate('');
                }}
              >
                <X size={20} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </div>

      {body}
    </>
  );
}
