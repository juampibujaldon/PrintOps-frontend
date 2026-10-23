// src/screens/SettingsWorkspaceScreen.tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { workspaceService } from '../services/workspaceService';
import type { Workspace } from '../services/workspaceService';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../context/ToastContext';
import { useUnsavedChangesGuard } from '../hooks/useUnsavedChangesGuard';
import { ErrorState, FormField, SaveBar, ScreenHeader, SelectField, SettingsSection, Skeleton } from '../components/ui';
import styles from './SettingsPage.module.css';

const CURRENCIES = [
  { value: 'ARS', label: 'ARS - Peso Argentino' },
  { value: 'USD', label: 'USD - Dólar Estadounidense' },
  { value: 'EUR', label: 'EUR - Euro' },
];

const TITLE = 'Workspace / Taller';

export default function SettingsWorkspaceScreen() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [original, setOriginal] = useState<Workspace | null>(null);
  const [form, setForm] = useState<Partial<Workspace>>({});
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const savedTimer = useRef<ReturnType<typeof setTimeout>>();

  const isManager = user?.role === 'MANAGER';

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await workspaceService.getMine();
      setOriginal(data);
      setForm(data);
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message || 'Error al cargar los datos del taller');
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
    Object.keys(form).some((key) => {
      const k = key as keyof Workspace;
      return form[k] !== original[k];
    });

  useUnsavedChangesGuard(hasChanges && isManager);

  const handleSave = async () => {
    if (!isManager) return;
    if (!form.name?.trim()) {
      showToast('El nombre del taller es obligatorio', { type: 'error', title: 'Error' });
      return;
    }

    try {
      setStatus('saving');
      const saved = await workspaceService.updateMine({
        name: form.name.trim(),
        phone: form.phone?.trim(),
        contactEmail: form.contactEmail?.trim(),
        address: form.address?.trim(),
        logoUrl: form.logoUrl?.trim(),
        currency: form.currency,
      });
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

  if (loading) {
    return (
      <>
        <ScreenHeader title={TITLE} showBack backTo="/settings" />
        <div className={`${styles.page} ${styles.loading}`}>
          <Skeleton height={100} />
          <Skeleton height={150} />
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
      <div className={`${styles.page} ${styles.sections}`}>
        <SettingsSection title="Información Principal">
          <FormField
            label="Nombre del Taller"
            value={form.name ?? ''}
            onChangeText={(t) => setForm({ ...form, name: t })}
            placeholder="Ej: PrintOps 3D"
            disabled={!isManager}
          />
          <SelectField
            label="Moneda"
            value={form.currency || 'ARS'}
            options={CURRENCIES}
            onChange={(v) => setForm({ ...form, currency: v })}
            disabled={!isManager}
          />
        </SettingsSection>

        <SettingsSection title="Datos de Contacto (Para PDFs)">
          <FormField
            label="Email de contacto"
            value={form.contactEmail ?? ''}
            onChangeText={(t) => setForm({ ...form, contactEmail: t })}
            placeholder="hola@taller.com"
            type="email"
            autoCapitalize="none"
            disabled={!isManager}
          />
          <FormField
            label="Teléfono"
            value={form.phone ?? ''}
            onChangeText={(t) => setForm({ ...form, phone: t })}
            placeholder="+54 9 11 1234 5678"
            type="tel"
            disabled={!isManager}
          />
          <FormField
            label="Dirección"
            value={form.address ?? ''}
            onChangeText={(t) => setForm({ ...form, address: t })}
            placeholder="Av. Falsa 123"
            disabled={!isManager}
          />
        </SettingsSection>
      </div>
      {isManager && <SaveBar hasChanges={hasChanges} status={status} onSave={handleSave} />}
    </>
  );
}
