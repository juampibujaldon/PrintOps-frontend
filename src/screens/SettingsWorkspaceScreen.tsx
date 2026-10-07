import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, TouchableOpacity, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors, Radius, Spacing, Typography } from '../constants/theme';
import { workspaceService, Workspace } from '../services/workspaceService';
import { useAuth } from '../hooks/useAuth';
import ScreenHeader from '../components/ui/ScreenHeader';
import SettingsSection from '../components/ui/SettingsSection';
import FormField from '../components/ui/FormField';
import SelectField from '../components/ui/SelectField';
import SaveBar from '../components/ui/SaveBar';
import Skeleton from '../components/ui/Skeleton';
import ErrorState from '../components/ui/ErrorState';

export default function SettingsWorkspaceScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [original, setOriginal] = useState<Workspace | null>(null);
  const [form, setForm] = useState<Partial<Workspace>>({});
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const isManager = user?.role === 'MANAGER';

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await workspaceService.getMine();
      setOriginal(data);
      setForm(data);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Error al cargar los datos del taller');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const hasChanges = original && Object.keys(form).some((key) => {
    const k = key as keyof Workspace;
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
    if (!isManager) return;
    if (!form.name?.trim()) {
      Alert.alert('Error', 'El nombre del taller es obligatorio');
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
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (e: any) {
      setStatus('idle');
      Alert.alert('Error', e.response?.data?.message || 'No se pudieron guardar los cambios');
    }
  };

  const handleCurrencySelect = () => {
    if (!isManager) return;
    Alert.alert(
      'Moneda',
      'Seleccioná la moneda por defecto',
      [
        { text: 'ARS - Peso Argentino', onPress: () => setForm({ ...form, currency: 'ARS' }) },
        { text: 'USD - Dólar Estadounidense', onPress: () => setForm({ ...form, currency: 'USD' }) },
        { text: 'EUR - Euro', onPress: () => setForm({ ...form, currency: 'EUR' }) },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Workspace / Taller" />
        <View style={styles.content}>
          <Skeleton style={{ height: 100, marginBottom: Spacing.md }} />
          <Skeleton style={{ height: 150 }} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Workspace / Taller" />
        <ErrorState error={error} onRetry={load} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title="Workspace / Taller" />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        
        <SettingsSection title="Información Principal">
          <FormField
            label="Nombre del Taller"
            value={form.name}
            onChangeText={(t) => setForm({ ...form, name: t })}
            placeholder="Ej: PrintOps 3D"
            editable={isManager}
          />
          <SelectField
            label="Moneda"
            value={form.currency || 'ARS'}
            onPress={handleCurrencySelect}
            disabled={!isManager}
          />
        </SettingsSection>

        <SettingsSection title="Datos de Contacto (Para PDFs)">
          <FormField
            label="Email de contacto"
            value={form.contactEmail}
            onChangeText={(t) => setForm({ ...form, contactEmail: t })}
            placeholder="hola@taller.com"
            keyboardType="email-address"
            autoCapitalize="none"
            editable={isManager}
          />
          <FormField
            label="Teléfono"
            value={form.phone}
            onChangeText={(t) => setForm({ ...form, phone: t })}
            placeholder="+54 9 11 1234 5678"
            keyboardType="phone-pad"
            editable={isManager}
          />
          <FormField
            label="Dirección"
            value={form.address}
            onChangeText={(t) => setForm({ ...form, address: t })}
            placeholder="Av. Falsa 123"
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
