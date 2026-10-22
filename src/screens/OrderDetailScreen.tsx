// src/screens/OrderDetailScreen.tsx
import { useCallback, useEffect, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Circle, ImagePlus, Camera, RefreshCw, X } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { ORDER_STATUS, ORDER_TYPE } from '../constants/orders';
import { orderService } from '../services/orderService';
import type { OrderResponse, OrderStatus, StatusHistory } from '../services/orderService';
import { useAuth } from '../hooks/useAuth';
import { parseId } from '../hooks/usePrinterById';
import { usePhotoPicker } from '../hooks/usePhotoPicker';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import StatusTimeline from '../components/StatusTimeline';
import { Badge, Button, Card, ErrorState, Modal, ScreenHeader, Skeleton, TextField } from '../components/ui';
import { cx } from '../utils/cx';
import styles from './OrderDetailScreen.module.css';

const MIN_REJECT_CHARS = 10;

type ApiError = { response?: { status?: number; data?: { message?: string } } };

export default function OrderDetailScreen() {
  const { orderId: rawId } = useParams();
  const orderId = parseId(rawId);
  const { user } = useAuth();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const isManager = user?.role === 'MANAGER';

  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [history, setHistory] = useState<StatusHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectComment, setRejectComment] = useState('');

  const [lightbox, setLightbox] = useState<number | null>(null);
  const picker = usePhotoPicker();
  const [uploading, setUploading] = useState(false);

  const load = useCallback(
    async (isRefresh = false) => {
      if (orderId == null) {
        setLoadError('No se encontró la orden');
        setLoading(false);
        return;
      }
      try {
        if (isRefresh) setRefreshing(true);
        setLoadError(null);
        const [o, h] = await Promise.all([orderService.getOrder(orderId), orderService.getHistory(orderId)]);
        setOrder(o);
        setHistory(h);
      } catch (error) {
        const message = (error as ApiError)?.response?.data?.message || 'No se pudo cargar la orden';
        setLoadError(message);
        showToast(message, { type: 'error', title: 'Error' });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [orderId, showToast],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const changeStatus = async (status: OrderStatus, comment?: string, successMessage?: string) => {
    if (orderId == null) return;
    setBusy(true);
    try {
      await orderService.updateStatus(orderId, status, comment);
      if (successMessage) showToast(successMessage, { type: 'success' });
      setRejectOpen(false);
      setRejectComment('');
      await load();
    } catch (error) {
      // FIX 4: 409 = conflicto de concurrencia en el stock (optimistic lock).
      if ((error as ApiError)?.response?.status === 409) {
        showToast('El stock fue modificado por otro proceso. Recargá e intentá de nuevo.', {
          type: 'error',
          title: 'Conflicto',
        });
      } else {
        showToast((error as ApiError)?.response?.data?.message || 'No se pudo cambiar el estado', {
          type: 'error',
          title: 'Error',
        });
      }
    } finally {
      setBusy(false);
    }
  };

  // Confirmación previa a cada PATCH (excepto rechazo, que usa el modal).
  const confirmAction = async (title: string, message: string, status: OrderStatus, successMessage: string) => {
    const ok = await confirm({ title, message, confirmLabel: 'Confirmar' });
    if (ok) await changeStatus(status, undefined, successMessage);
  };

  const confirmReject = () => {
    if (rejectComment.trim().length < MIN_REJECT_CHARS) return;
    void changeStatus('IN_PROGRESS', rejectComment.trim(), 'Orden devuelta al técnico');
  };

  const uploadPhotos = async () => {
    if (orderId == null || picker.files.length === 0) return;
    setUploading(true);
    try {
      const updated = await orderService.addPhotos(orderId, picker.files);
      setOrder(updated);
      picker.clear();
      showToast('Fotos agregadas', { type: 'success' });
    } catch (error) {
      showToast((error as ApiError)?.response?.data?.message || 'No se pudieron subir las fotos', {
        type: 'error',
        title: 'Error',
      });
    } finally {
      setUploading(false);
    }
  };

  const title = order ? `Orden #${order.id}` : 'Detalle de orden';

  if (loading) {
    return (
      <>
        <ScreenHeader title="Detalle de orden" showBack />
        <div aria-busy="true">
          <Skeleton height={140} className={styles.skeleton} />
          <Skeleton height={120} className={styles.skeleton} />
        </div>
      </>
    );
  }

  if (!order) {
    return (
      <>
        <ScreenHeader title="Detalle de orden" showBack backTo="/orders" />
        <ErrorState error={loadError ?? 'No se encontró la orden'} onRetry={() => void load()} />
      </>
    );
  }

  const status = ORDER_STATUS[order.status];
  const rejectReady = rejectComment.trim().length >= MIN_REJECT_CHARS;
  const photos = order.photos;

  return (
    <>
      <ScreenHeader
        title={title}
        subtitle={ORDER_TYPE[order.type]?.label ?? order.type}
        showBack
        backTo="/orders"
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

      <div className={styles.layout}>
        <div className={styles.column}>
          <Card className={styles.card}>
            <h2 className={styles.type}>Orden #{order.id}</h2>
            <p className={styles.typeLabel}>{ORDER_TYPE[order.type]?.label ?? order.type}</p>
            <div className={styles.statusWrap}>
              <Badge label={status.label} color={status.color} pulse={order.status === 'IN_REVIEW'} />
            </div>

            {order.description ? <p className={styles.description}>{order.description}</p> : null}

            <div className={styles.metaRow}>
              <span className={styles.meta}>Estimado: {order.estimatedTimeMinutes ?? '-'} min</span>
              <span className={styles.meta}>Real: {order.actualTimeMinutes ?? '-'} min</span>
            </div>
          </Card>

          <div className={styles.actions}>
            {isManager ? (
              <>
                {order.status === 'IN_REVIEW' ? (
                  <>
                    <Button
                      title="Aprobar"
                      className={styles.actionButton}
                      disabled={busy}
                      onPress={() =>
                        void confirmAction(
                          'Aprobar orden',
                          '¿Confirmás la aprobación y cierre de esta orden?',
                          'COMPLETED',
                          'Orden aprobada',
                        )
                      }
                    />
                    <Button
                      title="Rechazar"
                      variant="danger"
                      className={styles.actionButton}
                      disabled={busy}
                      onPress={() => setRejectOpen(true)}
                    />
                  </>
                ) : null}
                {order.status === 'PENDING' || order.status === 'IN_PROGRESS' || order.status === 'IN_REVIEW' ? (
                  <Button
                    title="Cancelar"
                    variant="secondary"
                    className={styles.actionButton}
                    disabled={busy}
                    onPress={() =>
                      void confirmAction(
                        'Cancelar orden',
                        '¿Confirmás la cancelación de esta orden?',
                        'CANCELLED',
                        'Orden cancelada',
                      )
                    }
                  />
                ) : null}
              </>
            ) : (
              <>
                {order.status === 'PENDING' ? (
                  <Button
                    title="Iniciar trabajo"
                    className={styles.actionButton}
                    disabled={busy}
                    onPress={() =>
                      void confirmAction(
                        'Iniciar trabajo',
                        '¿Confirmás el inicio de esta orden?',
                        'IN_PROGRESS',
                        'Trabajo iniciado',
                      )
                    }
                  />
                ) : null}
                {order.status === 'IN_PROGRESS' ? (
                  <Button
                    title="Enviar a revisión"
                    className={styles.actionButton}
                    disabled={busy}
                    onPress={() =>
                      void confirmAction(
                        'Enviar a revisión',
                        '¿Confirmás enviar esta orden a revisión?',
                        'IN_REVIEW',
                        'Enviada a revisión',
                      )
                    }
                  />
                ) : null}
                {order.status === 'PENDING' || order.status === 'IN_PROGRESS' ? (
                  <Button
                    title="Cancelar"
                    variant="secondary"
                    className={styles.actionButton}
                    disabled={busy}
                    onPress={() =>
                      void confirmAction(
                        'Cancelar orden',
                        '¿Confirmás la cancelación de esta orden?',
                        'CANCELLED',
                        'Orden cancelada',
                      )
                    }
                  />
                ) : null}
              </>
            )}
          </div>

          <h2 className={styles.sectionTitle}>Historial</h2>
          <Card className={styles.card}>
            <StatusTimeline history={history} />
          </Card>
        </div>

        <div className={styles.column}>
          <h2 className={styles.sectionTitle}>Checklist</h2>
          <Card className={styles.card}>
            {order.checklistItems.length === 0 ? <p className={styles.emptyText}>Sin ítems de checklist</p> : null}
            <ul>
              {order.checklistItems.map((item) => (
                <li key={item.id} className={styles.checklistRow}>
                  <span className={styles.checkIcon}>
                    {item.done ? (
                      <Check size={18} strokeWidth={2.5} style={{ color: 'var(--color-green)' }} aria-label="Hecho" />
                    ) : item.na ? (
                      <span className={styles.na} aria-label="No aplica">
                        N/A
                      </span>
                    ) : (
                      <Circle size={18} style={{ color: 'var(--color-text-tertiary)' }} aria-label="Pendiente" />
                    )}
                  </span>
                  <span className={cx(styles.checklistText, (item.done || item.na) && styles.checklistTextMuted)}>
                    {item.text}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <h2 className={styles.sectionTitle}>Piezas</h2>
          <Card className={styles.card}>
            {order.parts.length === 0 ? <p className={styles.emptyText}>Sin piezas registradas</p> : null}
            <ul>
              {order.parts.map((part) => (
                <li key={part.id} className={styles.partRow}>
                  <span className={styles.partName}>{part.partName || part.partNumber || 'Pieza externa'}</span>
                  <span className={styles.partQty}>x{part.quantity}</span>
                </li>
              ))}
            </ul>
          </Card>

          <h2 className={styles.sectionTitle}>Fotos</h2>
          <Card className={styles.card}>
            {photos.length === 0 && picker.photos.length === 0 ? (
              <p className={styles.emptyText}>Sin fotos</p>
            ) : null}
            {photos.length > 0 ? (
              <ul className={styles.photoGrid}>
                {photos.map((photo, i) => (
                  <li key={photo.id}>
                    <button
                      type="button"
                      className={styles.photoBtn}
                      onClick={() => setLightbox(i)}
                      aria-label={`Ver foto ${i + 1} de ${photos.length}`}
                    >
                      <img src={photo.url} alt={photo.label ?? `Foto ${i + 1}`} className={styles.photo} loading="lazy" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            {picker.photos.length > 0 ? (
              <>
                <p className={styles.pendingTitle}>Por subir</p>
                <ul className={styles.photoGrid}>
                  {picker.photos.map((p) => (
                    <li key={p.id} className={styles.pendingItem}>
                      <img src={p.previewUrl} alt="Foto por subir" className={styles.photo} />
                      <button
                        type="button"
                        className={styles.removePhoto}
                        onClick={() => picker.remove(p.id)}
                        aria-label="Quitar foto"
                        disabled={uploading}
                      >
                        <X size={14} strokeWidth={2.5} />
                      </button>
                    </li>
                  ))}
                </ul>
                <Button
                  title={`Subir ${picker.photos.length} foto${picker.photos.length > 1 ? 's' : ''}`}
                  loading={uploading}
                  onPress={() => void uploadPhotos()}
                  className={styles.uploadBtn}
                />
              </>
            ) : null}

            {picker.error ? (
              <p className={styles.errorText} role="alert">
                {picker.error}
              </p>
            ) : null}
            <div className={styles.photoActions}>
              <Button
                title="Cámara"
                variant="secondary"
                size="sm"
                fullWidth={false}
                icon={<Camera size={16} />}
                disabled={picker.busy || uploading}
                onPress={picker.pickFromCamera}
              />
              <Button
                title="Galería"
                variant="secondary"
                size="sm"
                fullWidth={false}
                icon={<ImagePlus size={16} />}
                disabled={picker.busy || uploading}
                onPress={picker.pickFromGallery}
              />
            </div>
          </Card>
        </div>
      </div>

      <Modal
        open={rejectOpen}
        onClose={() => !busy && setRejectOpen(false)}
        title="¿Por qué rechazás esta orden?"
        footer={
          <div className={styles.sheetFooter}>
            <Button title="Confirmar rechazo" variant="danger" disabled={!rejectReady} loading={busy} onPress={confirmReject} />
            <Button title="Cancelar" variant="ghost" disabled={busy} onPress={() => setRejectOpen(false)} />
          </div>
        }
      >
        <TextField
          multiline
          aria-label="Motivo del rechazo"
          placeholder={`Escribí el motivo (mínimo ${MIN_REJECT_CHARS} caracteres)...`}
          value={rejectComment}
          onChangeText={setRejectComment}
          data-autofocus
        />
      </Modal>

      <Lightbox photos={photos} index={lightbox} onChange={setLightbox} />
    </>
  );
}

function Lightbox({
  photos,
  index,
  onChange,
}: {
  photos: OrderResponse['photos'];
  index: number | null;
  onChange: (i: number | null) => void;
}) {
  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') onChange((index - 1 + photos.length) % photos.length);
      if (e.key === 'ArrowRight') onChange((index + 1) % photos.length);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [index, photos.length, onChange]);

  const photo = index !== null ? photos[index] : undefined;
  return (
    <Modal open={!!photo} onClose={() => onChange(null)} size="lg" ariaLabel="Foto de la orden" className={styles.lightbox}>
      {photo && index !== null ? (
        <div className={styles.lightboxBody}>
          <img src={photo.url} alt={photo.label ?? `Foto ${index + 1}`} className={styles.lightboxImg} />
          {photo.label ? <p className={styles.lightboxLabel}>{photo.label}</p> : null}
          {photos.length > 1 ? (
            <div className={styles.lightboxNav}>
              <Button
                title="Anterior"
                variant="secondary"
                size="sm"
                fullWidth={false}
                icon={<ChevronLeft size={16} />}
                onPress={() => onChange((index - 1 + photos.length) % photos.length)}
              />
              <span className={styles.lightboxCount}>
                {index + 1} / {photos.length}
              </span>
              <Button
                title="Siguiente"
                variant="secondary"
                size="sm"
                fullWidth={false}
                icon={<ChevronRight size={16} />}
                onPress={() => onChange((index + 1) % photos.length)}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}
