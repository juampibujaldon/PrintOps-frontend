// src/screens/StockScreen.tsx
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors, Radius, Spacing, Typography } from '../constants/theme';
import { SparePartDTO } from '../types/parts';
import { partService } from '../services/partService';
import SparePartCard from '../components/SparePartCard';
import CreateSparePartBottomSheet from '../components/CreateSparePartBottomSheet';
import StockAdjustmentModal from '../components/StockAdjustmentModal';
import TextField from '../components/ui/TextField';

// Inventario de repuestos (US-10). Accesible desde el menú lateral.
export default function StockScreen() {
  const navigation = useNavigation<any>();

  const [parts, setParts] = useState<SparePartDTO[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [lowStock, setLowStock] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sheet, setSheet] = useState<{ open: boolean; mode: 'create' | 'edit'; part: SparePartDTO | null }>({
    open: false,
    mode: 'create',
    part: null,
  });
  const [adjustPart, setAdjustPart] = useState<SparePartDTO | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [p, c] = await Promise.all([
        partService.listParts({ search: search || undefined, category: category || undefined, lowStock }),
        partService.getCategories(),
      ]);
      setParts(p);
      setCategories(c);
    } catch {
      setError('No se pudo cargar el inventario.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, category, lowStock]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const openMenu = (part: SparePartDTO) => {
    Alert.alert(part.name, '¿Qué deseás hacer?', [
      { text: 'Editar', onPress: () => setSheet({ open: true, mode: 'edit', part }) },
      { text: 'Ajustar stock', onPress: () => setAdjustPart(part) },
      { text: 'Ver movimientos', onPress: () => navigation.navigate('InicioStack', { screen: 'SparePartDetail', params: { partId: part.id } }) },
      { text: 'Eliminar', style: 'destructive', onPress: () => removePart(part) },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const removePart = (part: SparePartDTO) => {
    Alert.alert('Eliminar', `¿Eliminar "${part.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await partService.deletePart(part.id);
            setParts(prev => prev.filter(p => p.id !== part.id));
          } catch (e: any) {
            Alert.alert('Error', e?.response?.data?.message || 'No se pudo eliminar la pieza.');
          }
        },
      },
    ]);
  };

  const onSaved = (saved: SparePartDTO) => {
    setParts(prev => {
      const exists = prev.some(p => p.id === saved.id);
      return exists ? prev.map(p => (p.id === saved.id ? saved : p)) : [saved, ...prev];
    });
  };

  const onAdjusted = (saved: SparePartDTO) => {
    setParts(prev => prev.map(p => (p.id === saved.id ? saved : p)));
  };

  if (loading) {
    return (
      <View style={styles.container}>
        {[0, 1, 2, 3, 4].map(i => (
          <View key={i} style={styles.skeletonCard} />
        ))}
      </View>
    );
  }

  if (error && parts.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoading(true); load(); }}>
          <Text style={styles.retryText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TextField
        placeholder="Buscar por nombre o N° parte"
        value={search}
        onChangeText={setSearch}
        containerStyle={styles.search}
      />

      <View style={styles.chipRow}>
        <Chip label="Todos" selected={category === null} onPress={() => setCategory(null)} />
        {categories.map(c => (
          <Chip key={c} label={c} selected={category === c} onPress={() => setCategory(c)} />
        ))}
      </View>

      <TouchableOpacity style={[styles.lowChip, lowStock && styles.lowChipActive]} onPress={() => setLowStock(v => !v)}>
        <Text style={[styles.lowChipText, lowStock && styles.lowChipTextActive]}>⚠️ Solo stock bajo</Text>
      </TouchableOpacity>

      <FlatList
        data={parts}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => (
          <SparePartCard
            part={item}
            onMenuPress={() => openMenu(item)}
            onPress={() => navigation.navigate('InicioStack', { screen: 'SparePartDetail', params: { partId: item.id } })}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>
              {search || category || lowStock ? 'No encontramos piezas que coincidan' : 'No hay repuestos registrados'}
            </Text>
            <Text style={styles.emptySub}>
              {search || category || lowStock ? 'Probá con otros filtros.' : 'Agregá el primero con el botón +.'}
            </Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => setSheet({ open: true, mode: 'create', part: null })}>
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>

      <CreateSparePartBottomSheet
        visible={sheet.open}
        mode={sheet.mode}
        part={sheet.part}
        onClose={() => setSheet(s => ({ ...s, open: false }))}
        onSaved={onSaved}
      />

      <StockAdjustmentModal
        visible={adjustPart !== null}
        part={adjustPart}
        onClose={() => setAdjustPart(null)}
        onAdjusted={onAdjusted}
      />
    </View>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.chip, selected && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, selected && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  errorText: { color: Colors.textSecondary, fontSize: 15, marginBottom: Spacing.md, textAlign: 'center' },
  retryBtn: { backgroundColor: Colors.accent, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: Radius.md },
  retryText: { color: Colors.onAccent, fontWeight: '700' },
  search: { marginHorizontal: Spacing.lg, marginTop: Spacing.md, marginBottom: 0 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, paddingHorizontal: Spacing.lg, marginTop: Spacing.md },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.separator,
  },
  chipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  chipText: { ...Typography.footnote, color: Colors.textSecondary },
  chipTextActive: { color: Colors.onAccent },
  lowChip: {
    alignSelf: 'flex-start',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.statusMantenim,
  },
  lowChipActive: { backgroundColor: Colors.statusMantenim },
  lowChipText: { ...Typography.footnote, color: Colors.statusMantenim, fontWeight: '700' },
  lowChipTextActive: { color: Colors.onAccent },
  listContent: { padding: Spacing.lg, paddingBottom: 120 },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: Spacing.xl },
  emptyTitle: { ...Typography.headline, color: Colors.textPrimary, textAlign: 'center', marginBottom: Spacing.sm },
  emptySub: { ...Typography.subheadline, color: Colors.textSecondary, textAlign: 'center' },
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
  },
  fabText: { fontSize: 28, color: Colors.onAccent, fontWeight: '300', lineHeight: 32 },
  skeletonCard: {
    height: 110,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.separator,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
});
