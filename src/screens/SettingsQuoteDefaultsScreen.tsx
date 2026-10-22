// src/screens/SettingsQuoteDefaultsScreen.tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { workspaceService } from '../services/workspaceService';
import type { QuoteDefaults } from '../services/workspaceService';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../context/ToastContext';
import { useUnsavedChangesGuard } from '../hooks/useUnsavedChangesGuard';
import { ErrorState, FormField, SaveBar, ScreenHeader, SettingsSection, Skeleton } from '../components/ui';
import styles from './SettingsPage.module.css';

const TITLE = 'Valores del Presupuesto';

const decimal = (t: string) => t.replace(/[^0-9.]/g, '');
const integer = (t: string) => t.replace(/[^0-9]/g, '');

export default function SettingsQuoteDefaultsScreen() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [original, setOriginal] = useState<QuoteDefaults | null>(null);
  const [form, setForm] = useState<Partial<Record<keyof QuoteDefaults, string>>>({});
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const savedTimer = useRef<ReturnType<typeof setTimeout>>();

  const isManager = user?.role === 'MANAGER';

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await workspaceService.getQuoteDefaults();
      setOriginal(data);
      setForm({
        defaultEnergyPriceKwh: data.defaultEnergyPriceKwh.toString(),
        defaultOperatorHourlyRate: data.defaultOperatorHourlyRate.toString(),
        defaultDesignHourlyRate: data.defaultDesignHourlyRate.toString(),
        defaultMarginPercent: data.defaultMarginPercent.toString(),
        quoteValidityDays: data.quoteValidityDays.toString(),
      });
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message || 'Error al cargar los valores por defecto');
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
      const k = key as keyof QuoteDefaults;
      return parseFloat(form[k] || '0') !== original[k];
    });

  useUnsavedChangesGuard(hasChanges && isManager);

  const handleSave = async () => {
    if (!isManager) return;
    try {
      setStatus('saving');
      const payload: QuoteDefaults = {
        defaultEnergyPriceKwh: parseFloat(form.defaultEnergyPriceKwh || '0'),
        defaultOperatorHourlyRate: parseFloat(form.defaultOperatorHourlyRate || '0'),
        defaultDesignHourlyRate: parseFloat(form.defaultDesignHourlyRate || '0'),
        defaultMarginPercent: parseFloat(form.defaultMarginPercent || '0'),
        quoteValidityDays: parseInt(form.quoteValidityDays || '15', 10),
      };
      const saved = await workspaceService.updateQuoteDefaults(payload);
      setOriginal(saved);
      setStatus('saved');
      savedTimer.current = setTimeout(() => setStatus('idle'), 2000);
    } catch (e) {
      setStatus('idle');
      const err = e as { response?: { data?: { message?: string } } };
      showToast(err.response?.data?.message || 'No se pudieron guardar los cambios', { type: 'error', title: 'Error' });
    }
  };

  if (loading) {
    return (
      <>
        <ScreenHeader title={TITLE} showBack backTo="/settings" />
        <div className={`${styles.page} ${styles.loading}`}>
          <Skeleton height={100} />
          <Skeleton height={100} />
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <ScreenHeader title={TITLE} showBack backTo="/settings" />
        <ErrorState error={error} onRetry={load} />
      </>
    );
  }

  return (
    <>
      <ScreenHeader title={TITLE} showBack backTo="/settings" />
      <div className={styles.page}>
        <SettingsSection title="Costos base (Por defecto)">
          <FormField
            label="Precio Energía (kWh)"
            value={form.defaultEnergyPriceKwh ?? ''}
            onChangeText={(t) => setForm({ ...form, defaultEnergyPriceKwh: decimal(t) })}
            inputMode="decimal"
            placeholder="Ej: 50.5"
            disabled={!isManager}
          />
          <FormField
            label="Valor Hora Operario"
            value={form.defaultOperatorHourlyRate ?? ''}
            onChangeText={(t) => setForm({ ...form, defaultOperatorHourlyRate: decimal(t) })}
            inputMode="decimal"
            placeholder="Ej: 1500"
            disabled={!isManager}
          />
          <FormField
            label="Valor Hora Diseño (Opcional)"
            value={form.defaultDesignHourlyRate ?? ''}
            onChangeText={(t) => setForm({ ...form, defaultDesignHourlyRate: decimal(t) })}
            inputMode="decimal"
            placeholder="Ej: 3000"
            disabled={!isManager}
          />
        </SettingsSection>

        <SettingsSection title="Márgenes y Validez">
          <FormField
            label="Margen de Ganancia (%)"
            value={form.defaultMarginPercent ?? ''}
            onChangeText={(t) => setForm({ ...form, defaultMarginPercent: decimal(t) })}
            inputMode="decimal"
            placeholder="Ej: 30"
            disabled={!isManager}
          />
          <FormField
            label="Días de validez del presupuesto"
            value={form.quoteValidityDays ?? ''}
            onChangeText={(t) => setForm({ ...form, quoteValidityDays: integer(t) })}
            inputMode="numeric"
            placeholder="Ej: 15"
            disabled={!isManager}
          />
        </SettingsSection>
      </div>
      {isManager && <SaveBar hasChanges={hasChanges} status={status} onSave={handleSave} />}
    </>
  );
}
