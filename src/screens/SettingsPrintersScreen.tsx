import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing } from '../constants/theme';
import { printerService, PrinterResponse } from '../services/printerService';
import ScreenHeader from '../components/ui/ScreenHeader';
import SettingsSection from '../components/ui/SettingsSection';
import SettingsRow from '../components/ui/SettingsRow';
import Skeleton from '../components/ui/Skeleton';
import ErrorState from '../components/ui/ErrorState';
import { Printer as PrinterIcon } from 'lucide-react-native';

export default function SettingsPrintersScreen() {
  const navigation = useNavigation<any>();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [printers, setPrinters] = useState<PrinterResponse[]>([]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await printerService.getAllPrinters();
      setPrinters(data);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Error al cargar impresoras');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && printers.length === 0) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Impresoras y Mantenimiento" />
        <View style={styles.content}>
          <Skeleton style={{ height: 60, marginBottom: Spacing.sm }} />
          <Skeleton style={{ height: 60, marginBottom: Spacing.sm }} />
        </View>
      </View>
    );
  }

  if (error && printers.length === 0) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Impresoras y Mantenimiento" />
        <ErrorState error={error} onRetry={load} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Impresoras y Mantenimiento" />
      <ScrollView 
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={Colors.primary} />}
      >
        <SettingsSection title="Tus Impresoras">
          {printers.map((p, idx) => (
            <SettingsRow
              key={p.id}
              label={`${p.brand} ${p.model}`}
              value={p.serialNumber}
              icon={<PrinterIcon color={Colors.textSecondary} size={24} />}
              isLast={idx === printers.length - 1}
              onPress={() => navigation.navigate('PrinterDetail', { printerId: p.id })}
            />
          ))}
        </SettingsSection>

        <SettingsSection title="Tipos de Filamento (Lectura)">
          {['PLA', 'ABS', 'PETG', 'TPU', 'ASA', 'OTHER'].map((f, idx) => (
            <SettingsRow
              key={f}
              label={f}
              showChevron={false}
              isLast={idx === 5}
            />
          ))}
        </SettingsSection>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg },
  scroll: { paddingBottom: 100, paddingTop: Spacing.md },
});
