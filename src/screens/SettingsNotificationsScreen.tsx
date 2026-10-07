import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing } from '../constants/theme';
import { notificationPreferenceService, NotificationPreference } from '../services/notificationPreferenceService';
import { useAuth } from '../hooks/useAuth';
import ScreenHeader from '../components/ui/ScreenHeader';
import SettingsSection from '../components/ui/SettingsSection';
import SwitchRow from '../components/ui/SwitchRow';
import SaveBar from '../components/ui/SaveBar';
import Skeleton from '../components/ui/Skeleton';
import ErrorState from '../components/ui/ErrorState';

export default function SettingsNotificationsScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  
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

  const isManager = user?.role === 'MANAGER';

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await notificationPreferenceService.getMine();
      setOriginal(data);
      setForm(data);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Error al cargar preferencias');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const hasChanges = original && Object.keys(original).some((key) => {
    const k = key as keyof NotificationPreference;
    return form[k] !== original[k];
  });

  useEffect(() => {
    const beforeRemove = (e: any) => {
      if (!hasChanges) return;
      e.preventDefault();
      Alert.alert(
        'Cambios sin guardar',
        'Tenés cambios sin guardar. ¿Seguro querés salir?',
        [
          { text: 'Quedarme', style: 'cancel', onPress: () => {} },
          { text: 'Descartar', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
        ]
      );
    };
    navigation.addListener('beforeRemove', beforeRemove);
    return () => navigation.removeListener('beforeRemove', beforeRemove);
  }, [navigation, hasChanges]);

  const handleSave = async () => {
    try {
      setStatus('saving');
      const saved = await notificationPreferenceService.updateMine(form);
      setOriginal(saved);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (e: any) {
      setStatus('idle');
      Alert.alert('Error', e.response?.data?.message || 'No se pudieron guardar los cambios');
    }
  };

  const updateForm = (key: keyof NotificationPreference, value: boolean) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Notificaciones" />
        <View style={styles.content}>
          <Skeleton style={{ height: 200, marginBottom: Spacing.md }} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Notificaciones" />
        <ErrorState error={error} onRetry={load} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Notificaciones" />
      <ScrollView contentContainerStyle={styles.scroll}>
        
        <SettingsSection title="Operación del Taller">
          <SwitchRow
            label="Órdenes asignadas"
            description="Recibir aviso cuando me asignan una orden"
            value={form.assignedOrders}
            onValueChange={(v) => updateForm('assignedOrders', v)}
          />
          {isManager && (
            <SwitchRow
              label="Órdenes en revisión"
              description="Avisar cuando un técnico marca una orden para revisión"
              value={form.ordersInReview}
              onValueChange={(v) => updateForm('ordersInReview', v)}
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

      </ScrollView>

      <SaveBar hasChanges={!!hasChanges} status={status} onSave={handleSave} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg },
  scroll: { paddingBottom: 100, paddingTop: Spacing.md },
});
