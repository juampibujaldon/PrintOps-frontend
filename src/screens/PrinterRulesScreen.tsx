// src/screens/PrinterRulesScreen.tsx
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Radius, Spacing } from '../constants/theme';
import { TecnicoStackParamList } from '../navigation/TecnicoStack';
import { MaintenanceRuleDTO } from '../types/rules';
import { ruleService } from '../services/ruleService';
import RuleProgressCard from '../components/RuleProgressCard';
import CreateRuleBottomSheet from '../components/CreateRuleBottomSheet';

type Props = NativeStackScreenProps<TecnicoStackParamList, 'PrinterRules'>;

export default function PrinterRulesScreen({ route }: Props) {
  const { printer } = route.params;
  const printerId = Number(printer.id);

  const [rules, setRules] = useState<MaintenanceRuleDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await ruleService.getRules(printerId);
      setRules(data);
    } catch {
      setError('No se pudieron cargar las reglas.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [printerId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  // Menú "···" de cada tarjeta: Pausar / Reactivar / Eliminar.
  const openMenu = (rule: MaintenanceRuleDTO) => {
    const options: { text: string; onPress?: () => void; style?: 'destructive' | 'cancel' }[] = [];
    if (rule.active) {
      options.push({ text: 'Pausar', onPress: () => toggle(rule, 'pause') });
    } else {
      options.push({ text: 'Reactivar', onPress: () => toggle(rule, 'resume') });
    }
    options.push({ text: 'Eliminar', style: 'destructive', onPress: () => remove(rule) });
    options.push({ text: 'Cancelar', style: 'cancel' });
    Alert.alert('Regla de mantenimiento', undefined, options);
  };

  const toggle = async (rule: MaintenanceRuleDTO, action: 'pause' | 'resume') => {
    try {
      const updated =
        action === 'pause' ? await ruleService.pauseRule(rule.id) : await ruleService.resumeRule(rule.id);
      setRules(prev => prev.map(r => (r.id === updated.id ? updated : r)));
    } catch {
      Alert.alert('Error', 'No se pudo actualizar la regla.');
    }
  };

  const remove = async (rule: MaintenanceRuleDTO) => {
    try {
      await ruleService.deleteRule(rule.id);
      setRules(prev => prev.filter(r => r.id !== rule.id));
    } catch {
      Alert.alert('Error', 'No se pudo eliminar la regla.');
    }
  };

  const onCreated = (created: MaintenanceRuleDTO) => {
    setRules(prev => [...prev, created]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  if (error && rules.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={() => {
            setLoading(true);
            load();
          }}
        >
          <Text style={styles.retryText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={rules}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => (
          <RuleProgressCard rule={item} onMenuPress={() => openMenu(item)} />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🛠️</Text>
            <Text style={styles.emptyTitle}>Sin reglas configuradas</Text>
            <Text style={styles.emptySub}>
              Esta impresora no tiene reglas configuradas — creá la primera
            </Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => setSheetOpen(true)} activeOpacity={0.85}>
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>

      <CreateRuleBottomSheet
        visible={sheetOpen}
        printerId={printerId}
        onClose={() => setSheetOpen(false)}
        onCreated={onCreated}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  errorText: { color: Colors.textSecondary, fontSize: 15, marginBottom: Spacing.md, textAlign: 'center' },
  retryBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
  },
  retryText: { color: Colors.background, fontWeight: '700' },
  listContent: { padding: Spacing.lg, paddingBottom: 120 },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: Spacing.xl },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.md },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.sm, textAlign: 'center' },
  emptySub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 10,
  },
  fabText: { fontSize: 28, color: Colors.background, fontWeight: '300', lineHeight: 32 },
});
