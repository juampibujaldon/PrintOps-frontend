import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, Typography } from '../constants/theme';
import { workspaceService, QuoteDefaults } from '../services/workspaceService';
import { useAuth } from '../hooks/useAuth';
import ScreenHeader from '../components/ui/ScreenHeader';
import SettingsSection from '../components/ui/SettingsSection';
import FormField from '../components/ui/FormField';
import SaveBar from '../components/ui/SaveBar';
import Skeleton from '../components/ui/Skeleton';
import ErrorState from '../components/ui/ErrorState';

export default function SettingsQuoteDefaultsScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [original, setOriginal] = useState<QuoteDefaults | null>(null);
  const [form, setForm] = useState<Partial<Record<keyof QuoteDefaults, string>>>({});
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

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
    } catch (e: any) {
      setError(e.response?.data?.message || 'Error al cargar los valores por defecto');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const hasChanges = original && Object.keys(original).some((key) => {
    const k = key as keyof QuoteDefaults;
    return parseFloat(form[k] || '0') !== original[k];
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
      setTimeout(() => setStatus('idle'), 2000);
    } catch (e: any) {
      setStatus('idle');
      Alert.alert('Error', e.response?.data?.message || 'No se pudieron guardar los cambios');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Valores del Presupuesto" />
        <View style={styles.content}>
          <Skeleton style={{ height: 100, marginBottom: Spacing.md }} />
          <Skeleton style={{ height: 100 }} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Valores del Presupuesto" />
        <ErrorState error={error} onRetry={load} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title="Valores del Presupuesto" />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        <SettingsSection title="Costos base (Por defecto)">
          <FormField
            label="Precio Energía (kWh)"
            value={form.defaultEnergyPriceKwh}
            onChangeText={(t) => setForm({ ...form, defaultEnergyPriceKwh: t.replace(/[^0-9.]/g, '') })}
            keyboardType="decimal-pad"
            placeholder="Ej: 50.5"
            editable={isManager}
          />
          <FormField
            label="Valor Hora Operario"
            value={form.defaultOperatorHourlyRate}
            onChangeText={(t) => setForm({ ...form, defaultOperatorHourlyRate: t.replace(/[^0-9.]/g, '') })}
            keyboardType="decimal-pad"
            placeholder="Ej: 1500"
            editable={isManager}
          />
          <FormField
            label="Valor Hora Diseño (Opcional)"
            value={form.defaultDesignHourlyRate}
            onChangeText={(t) => setForm({ ...form, defaultDesignHourlyRate: t.replace(/[^0-9.]/g, '') })}
            keyboardType="decimal-pad"
            placeholder="Ej: 3000"
            editable={isManager}
          />
        </SettingsSection>

        <SettingsSection title="Márgenes y Validez">
          <FormField
            label="Margen de Ganancia (%)"
            value={form.defaultMarginPercent}
            onChangeText={(t) => setForm({ ...form, defaultMarginPercent: t.replace(/[^0-9.]/g, '') })}
            keyboardType="decimal-pad"
            placeholder="Ej: 30"
            editable={isManager}
          />
          <FormField
            label="Días de validez del presupuesto"
            value={form.quoteValidityDays}
            onChangeText={(t) => setForm({ ...form, quoteValidityDays: t.replace(/[^0-9]/g, '') })}
            keyboardType="number-pad"
            placeholder="Ej: 15"
            editable={isManager}
          />
        </SettingsSection>
      </ScrollView>

      {isManager && <SaveBar hasChanges={!!hasChanges} status={status} onSave={handleSave} />}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg },
  scroll: { paddingBottom: 100, paddingTop: Spacing.md },
});
