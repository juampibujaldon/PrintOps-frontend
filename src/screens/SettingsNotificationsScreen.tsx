// src/screens/SettingsNotificationsScreen.tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { notificationPreferenceService } from '../services/notificationPreferenceService';
import type { NotificationPreference } from '../services/notificationPreferenceService';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../context/ToastContext';
import { useUnsavedChangesGuard } from '../hooks/useUnsavedChangesGuard';
import { ErrorState, SaveBar, ScreenHeader, SettingsSection, Skeleton, SwitchRow } from '../components/ui';
import styles from './SettingsPage.module.css';

export default function SettingsNotificationsScreen() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [original, setOriginal] = useState<NotificationPreference | null>(null);
  const [form, setForm] = useState<NotificationPreference>({
    maintenanceDue: true,
    lowStock: true,
    assignedOrders: true,
    ordersInReview: true,
    dailySummary: false,
    dailySummaryTime: '09:00',
  });
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const savedTimer = useRef<ReturnType<typeof setTimeout>>();

  const isManager = user?.role === 'MANAGER';

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await notificationPreferenceService.getMine();
      setOriginal(data);
      setForm(data);
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message || 'Error al cargar preferencias');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    return () => clearTimeout(savedTimer.current);
  }, [load]);

  const hasChanges =
    !!original &&
    Object.keys(original).some((key) => {
      const k = key as keyof NotificationPreference;
      return form[k] !== original[k];
    });

  useUnsavedChangesGuard(hasChanges);

  const handleSave = async () => {
    try {
      setStatus('saving');
      const saved = await notificationPreferenceService.updateMine(form);
      setOriginal(saved);
      setForm(saved);
      setStatus('saved');
      savedTimer.current = setTimeout(() => setStatus('idle'), 2000);
    } catch (e) {
      setStatus('idle');
      const err = e as { response?: { data?: { message?: string } } };
      showToast(err.response?.data?.message || 'No se pudieron guardar los cambios', { type: 'error', title: 'Error' });
    }
  };

  const updateForm = (key: keyof NotificationPreference, value: boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <>
        <ScreenHeader title="Notificaciones" showBack backTo="/settings" />
        <div className={styles.page}>
          <Skeleton height={200} />
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <ScreenHeader title="Notificaciones" showBack backTo="/settings" />
        <ErrorState error={error} onRetry={load} />
      </>
    );
  }

  return (
    <>
      <ScreenHeader title="Notificaciones" showBack backTo="/settings" />
      <div className={styles.page}>
        <SettingsSection title="Operación del Taller">
          <SwitchRow
            label="Órdenes asignadas"
            description="Recibir aviso cuando me asignan una orden"
            value={form.assignedOrders}
            onValueChange={(v) => updateForm('assignedOrders', v)}
            isLast={!isManager}
          />
          {isManager && (
            <SwitchRow
              label="Órdenes en revisión"
              description="Avisar cuando un técnico marca una orden para revisión"
              value={form.ordersInReview}
              onValueChange={(v) => updateForm('ordersInReview', v)}
              isLast
            />
          )}
        </SettingsSection>

        <SettingsSection title="Equipos y Stock">
          <SwitchRow
            label="Mantenimiento vencido"
            description="Alertar si una impresora necesita revisión"
            value={form.maintenanceDue}
            onValueChange={(v) => updateForm('maintenanceDue', v)}
          />
          <SwitchRow
            label="Stock bajo"
            description="Avisar cuando hay componentes críticos sin stock"
            value={form.lowStock}
            onValueChange={(v) => updateForm('lowStock', v)}
            isLast
          />
        </SettingsSection>

        <SettingsSection title="Resúmenes">
          <SwitchRow
            label="Resumen Diario"
            description="Notificación con el resumen de la jornada a las 09:00"
            value={form.dailySummary}
            onValueChange={(v) => updateForm('dailySummary', v)}
            isLast
          />
        </SettingsSection>
      </div>
      <SaveBar hasChanges={hasChanges} status={status} onSave={handleSave} />
    </>
  );
}
