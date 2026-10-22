// src/screens/PrinterHistoryScreen.tsx
import { useNavigate } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { usePrinterById } from '../hooks/usePrinterById';
import { usePrinterHistory } from '../hooks/usePrinterHistory';
import MetricsSummary from '../components/history/MetricsSummary';
import HistoryFilters from '../components/history/HistoryFilters';
import HistoryTimeline from '../components/history/HistoryTimeline';
import { Button, ErrorState, ScreenHeader, Skeleton } from '../components/ui';
import styles from './PrinterHistoryScreen.module.css';

export default function PrinterHistoryScreen() {
  const navigate = useNavigate();
  const { printerId, printer } = usePrinterById();
  if (printerId == null) {
    return (
      <>
        <ScreenHeader title="Historial" backTo="/printers" />
        <ErrorState error="No se encontró la impresora." onRetry={() => navigate('/printers')} />
      </>
    );
  }
  return <HistoryContent printerId={printerId} printerName={printer ? printer.name || printer.model : null} hours={printer?.totalPrintingHours ?? null} />;
}

function HistoryContent({
  printerId,
  printerName,
  hours,
}: {
  printerId: number;
  printerName: string | null;
  hours: number | null;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const h = usePrinterHistory(printerId);
  const { filters, orders, metrics } = h;

  const emptyComponent = h.hasActiveFilters ? (
    <div className={styles.empty}>
      <h2 className={styles.emptyTitle}>No hay mantenimientos que coincidan</h2>
      <p className={styles.emptySub}>Probá con otros filtros.</p>
      <Button title="Limpiar filtros" fullWidth={false} onPress={h.clearFilters} />
    </div>
  ) : (
    <div className={styles.empty}>
      <h2 className={styles.emptyTitle}>Esta impresora no tiene mantenimientos</h2>
      <p className={styles.emptySub}>El historial aparecerá acá una vez que se registre la primera orden.</p>
      {user?.role === 'TECNICO' ? (
        <Button
          title="Crear primera orden"
          fullWidth={false}
          onPress={() => navigate(`/printers/${printerId}/orders/new`)}
        />
      ) : null}
    </div>
  );

  return (
    <>
      <ScreenHeader
        title="Historial"
        subtitle={printerName ?? undefined}
        backTo={`/printers/${printerId}`}
        rightContent={
          <Button
            title="Actualizar"
            variant="secondary"
            size="sm"
            fullWidth={false}
            icon={<RefreshCw size={16} />}
            onPress={h.retry}
          />
        }
      />

      <div className={styles.content}>
        <MetricsSummary
          metrics={metrics}
          loading={h.isLoadingMetrics}
          printerName={printerName ?? 'Impresora'}
          totalHours={hours}
        />
        <HistoryFilters
          type={filters.type}
          from={filters.from}
          to={filters.to}
          onTypeChange={h.setType}
          onDateRangeChange={h.setDateRange}
        />

        {h.isLoadingOrders ? (
          <ul className={styles.skeletonList} aria-busy="true" aria-label="Cargando historial">
            {[0, 1, 2, 3].map((i) => (
              <li key={i} className={styles.skeletonItem}>
                <span className={styles.skeletonDot} />
                <div className={styles.skeletonCard}>
                  <Skeleton height={12} width="35%" />
                  <Skeleton height={12} width="90%" />
                  <Skeleton height={12} width="60%" />
                </div>
              </li>
            ))}
          </ul>
        ) : h.error && orders.length === 0 ? (
          <ErrorState error={h.error} onRetry={h.retry} />
        ) : (
          <HistoryTimeline
            orders={orders}
            hasMore={h.hasMore}
            isLoadingMore={h.isLoadingMore}
            onLoadMore={h.loadMore}
            onPressOrder={(id) => navigate(`/orders/${id}`)}
            empty={emptyComponent}
          />
        )}
      </div>
    </>
  );
}
