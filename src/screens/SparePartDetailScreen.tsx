// src/screens/SparePartDetailScreen.tsx
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Radius, Spacing, Typography } from '../constants/theme';
import { TecnicoStackParamList } from '../navigation/TecnicoStack';
import { MovementType, SparePartDTO, StockMovementDTO } from '../types/parts';
import { partService } from '../services/partService';
import StockAdjustmentModal from '../components/StockAdjustmentModal';
import Button from '../components/ui/Button';

type Props = NativeStackScreenProps<TecnicoStackParamList, 'SparePartDetail'>;

const MOVEMENT_META: Record<MovementType, { label: string; color: string }> = {
  PURCHASE: { label: 'Compra', color: '#606c38' },
  ORDER_USE: { label: 'Uso en orden', color: '#bc6c25' },
  ADJUSTMENT: { label: 'Ajuste', color: '#dda15e' },
  RETURN: { label: 'Devolución', color: '#283618' },
};

export default function SparePartDetailScreen({ route }: Props) {
  const { partId } = route.params;

  const [part, setPart] = useState<SparePartDTO | null>(null);
  const [movements, setMovements] = useState<StockMovementDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adjustType, setAdjustType] = useState<MovementType | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [p, m] = await Promise.all([
        partService.getPart(partId),
        partService.getMovements(partId),
      ]);
      setPart(p);
      setMovements(m);
    } catch {
      setError('No se pudo cargar la pieza.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [partId]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const onAdjusted = (saved: SparePartDTO) => {
    setPart(saved);
    load();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.accent} />
      </View>
    );
  }

  if (error || !part) {
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
      <FlatList
        data={movements}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <Text style={styles.name}>{part.name}</Text>
              <Text style={styles.partNumber}>{part.partNumber}</Text>
              {part.category ? (
                <View style={styles.categoryChip}>
                  <Text style={styles.categoryText}>{part.category}</Text>
                </View>
              ) : null}
              {part.supplierUrl ? (
                <TouchableOpacity onPress={() => Linking.openURL(part.supplierUrl!)}>
                  <Text style={styles.supplier}>Ver proveedor ↗</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={styles.stockPanel}>
              <Text style={styles.stockBig}>{part.stock}</Text>
              <Text style={styles.stockLabel}>en stock · mínimo {part.minStock}</Text>
              <Text style={styles.price}>${part.unitPrice.toFixed(2)} / unidad</Text>
              <View style={styles.stockActions}>
                <Button title="Entrada [+]" variant="secondary" onPress={() => setAdjustType('PURCHASE')} style={styles.stockAction} />
                <Button title="Ajuste [~]" variant="secondary" onPress={() => setAdjustType('ADJUSTMENT')} style={styles.stockAction} />
              </View>
            </View>

            <Text style={styles.movTitle}>Historial de movimientos</Text>
          </>
        }
        renderItem={({ item }) => {
          const meta = MOVEMENT_META[item.type] ?? { label: item.type, color: Colors.textTertiary };
          const positive = item.quantityChange >= 0;
          return (
            <View style={styles.movementRow}>
              <View style={[styles.movementBadge, { backgroundColor: meta.color }]}>
                <Text style={styles.movementBadgeText}>{meta.label}</Text>
              </View>
              <View style={styles.movementInfo}>
                <Text style={styles.movementQty}>
                  <Text style={positive ? styles.qtyIn : styles.qtyOut}>
                    {positive ? `+${item.quantityChange}` : item.quantityChange}
                  </Text>{' '}
                  · {item.quantityBefore} → {item.quantityAfter}
                </Text>
                {item.note ? <Text style={styles.movementNote}>{item.note}</Text> : null}
                <Text style={styles.movementMeta}>
                  {item.performedByName ? `${item.performedByName} · ` : ''}
                  {new Date(item.performedAt).toLocaleString('es-AR')}
                  {item.orderNumber ? ` · ${item.orderNumber}` : ''}
                </Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>Sin movimientos registrados</Text>}
      />

      <StockAdjustmentModal
        visible={adjustType !== null}
        part={part}
        initialType={adjustType ?? 'PURCHASE'}
        onClose={() => setAdjustType(null)}
        onAdjusted={onAdjusted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.lg, backgroundColor: Colors.background },
  errorText: { color: Colors.textSecondary, fontSize: 15, marginBottom: Spacing.md, textAlign: 'center' },
  retryBtn: { backgroundColor: Colors.accent, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: Radius.md },
  retryText: { color: Colors.onAccent, fontWeight: '700' },
  listContent: { padding: Spacing.lg, paddingBottom: 40 },
  header: { marginBottom: Spacing.md },
  name: { ...Typography.title2, color: Colors.textPrimary },
  partNumber: { ...Typography.subheadline, color: Colors.textSecondary, marginTop: 2 },
  categoryChip: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.background,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.separator,
  },
  categoryText: { ...Typography.caption1, color: Colors.textSecondary },
  supplier: { ...Typography.footnote, color: Colors.accent, marginTop: Spacing.sm },
  stockPanel: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.separator,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  stockBig: { ...Typography.largeTitle, color: Colors.textPrimary },
  stockLabel: { ...Typography.footnote, color: Colors.textSecondary },
  price: { ...Typography.subheadline, color: Colors.textPrimary, marginTop: Spacing.sm },
  stockActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  stockAction: { flex: 1 },
  movTitle: { ...Typography.title3, color: Colors.textPrimary, marginBottom: Spacing.sm },
  movementRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.md },
  movementBadge: {
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: Spacing.sm,
    marginTop: 2,
  },
  movementBadgeText: { ...Typography.caption2, color: '#fff', fontWeight: '700' },
  movementInfo: { flex: 1 },
  movementQty: { ...Typography.subheadline, color: Colors.textPrimary },
  qtyIn: { color: Colors.statusOperativa, fontWeight: '700' },
  qtyOut: { color: Colors.statusFuera, fontWeight: '700' },
  movementNote: { ...Typography.footnote, color: Colors.textSecondary, marginTop: 2 },
  movementMeta: { ...Typography.caption2, color: Colors.textTertiary, marginTop: 2 },
  empty: { ...Typography.subheadline, color: Colors.textSecondary, textAlign: 'center', paddingVertical: Spacing.lg },
});
