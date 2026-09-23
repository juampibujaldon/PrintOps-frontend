// src/screens/QuoteHistoryScreen.tsx
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Radius, Spacing, Typography } from '../constants/theme';
import { TecnicoStackParamList } from '../navigation/TecnicoStack';
import { quoteService } from '../services/quoteService';
import {
  Quote,
  QuoteStatus,
  QUOTE_STATUS_COLORS,
  QUOTE_STATUS_LABELS,
} from '../types/quote';
import Badge from '../components/ui/Badge';
import TextField from '../components/ui/TextField';
import PressableScale from '../components/ui/PressableScale';

type Props = NativeStackScreenProps<TecnicoStackParamList, 'QuoteHistory'>;

const money = (v: number) => `$${v.toFixed(2)}`;

const STATUS_FILTERS: Array<{ value: QuoteStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'Todos' },
  { value: 'DRAFT', label: 'Borrador' },
  { value: 'SENT', label: 'Enviado' },
  { value: 'ACCEPTED', label: 'Aceptado' },
  { value: 'REJECTED', label: 'Rechazado' },
];

export default function QuoteHistoryScreen({ navigation }: Props) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | 'ALL'>('ALL');
  const [clientFilter, setClientFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await quoteService.list({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        clientName: clientFilter.trim() || undefined,
        from: fromDate.trim() || undefined,
        to: toDate.trim() || undefined,
      });
      setQuotes(data);
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'No se pudieron cargar los presupuestos');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, clientFilter, fromDate, toDate]);

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [load]),
  );

  const changeStatus = async (id: number, status: QuoteStatus) => {
    try {
      await quoteService.updateStatus(id, status);
      load();
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'No se pudo cambiar el estado');
    }
  };

  const duplicate = async (id: number) => {
    try {
      const q = await quoteService.duplicate(id);
      navigation.navigate('QuoteCalculator', { quoteId: q.id, title: `Basado en ${q.quoteNumber}` });
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'No se pudo duplicar');
    }
  };

  const removeQuote = async (id: number) => {
    try {
      await quoteService.remove(id);
      load();
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'No se pudo eliminar');
    }
  };

  const renderActions = (quote: Quote) => {
    const actions: Array<{ label: string; color: string; onPress: () => void }> = [];
    if (quote.status === 'DRAFT') {
      actions.push({ label: 'Enviar', color: Colors.accent, onPress: () => changeStatus(quote.id, 'SENT') });
      actions.push({ label: 'Eliminar', color: Colors.error, onPress: () => removeQuote(quote.id) });
    } else if (quote.status === 'SENT') {
      actions.push({ label: 'Aceptar', color: Colors.statusOperativa, onPress: () => changeStatus(quote.id, 'ACCEPTED') });
      actions.push({ label: 'Rechazar', color: Colors.error, onPress: () => changeStatus(quote.id, 'REJECTED') });
    }
    actions.push({ label: 'Duplicar', color: Colors.textSecondary, onPress: () => duplicate(quote.id) });

    return (
      <View style={styles.actionsRow}>
        {actions.map(a => (
          <TouchableOpacity key={a.label} style={[styles.actionBtn, { backgroundColor: a.color }]} onPress={a.onPress}>
            <Text style={styles.actionText}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderCard = ({ item }: { item: Quote }) => (
    <ReanimatedSwipeable renderRightActions={() => renderActions(item)} overshootRight={false}>
      <PressableScale
        style={styles.card}
        onPress={() => navigation.navigate('QuoteCalculator', { quoteId: item.id })}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.quoteNumber}>{item.quoteNumber}</Text>
          <Badge label={QUOTE_STATUS_LABELS[item.status]} color={QUOTE_STATUS_COLORS[item.status]} />
        </View>
        <Text style={styles.client} numberOfLines={1}>
          {item.clientName || 'Sin cliente'}
          {item.jobDescription ? ` · ${item.jobDescription}` : ''}
        </Text>
        <View style={styles.cardFooter}>
          <Text style={styles.price}>{money(item.totalPrice)}</Text>
          <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString()}</Text>
        </View>
      </PressableScale>
    </ReanimatedSwipeable>
  );

  return (
    <View style={styles.container}>
      <View style={styles.filters}>
        <View style={styles.chipsRow}>
          {STATUS_FILTERS.map(f => (
            <PressableScale
              key={f.value}
              style={[styles.chip, statusFilter === f.value && styles.chipActive]}
              onPress={() => setStatusFilter(f.value)}
            >
              <Text style={[styles.chipText, statusFilter === f.value && styles.chipTextActive]}>{f.label}</Text>
            </PressableScale>
          ))}
        </View>
        <TextField
          placeholder="Buscar por cliente"
          value={clientFilter}
          onChangeText={setClientFilter}
          containerStyle={styles.filterField}
        />
        <View style={styles.dateRow}>
          <TextField
            placeholder="Desde (YYYY-MM-DD)"
            value={fromDate}
            onChangeText={setFromDate}
            containerStyle={styles.dateField}
          />
          <TextField
            placeholder="Hasta (YYYY-MM-DD)"
            value={toDate}
            onChangeText={setToDate}
            containerStyle={styles.dateField}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.accent} />
        </View>
      ) : (
        <FlatList
          data={quotes}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={renderCard}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>Todavía no tenés presupuestos guardados — creá el primero</Text>
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('QuoteCalculator', {})}
      >
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  filters: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.separator },
  chipActive: { backgroundColor: Colors.textPrimary, borderColor: Colors.textPrimary },
  chipText: { ...Typography.footnote, color: Colors.textSecondary, fontWeight: '600' },
  chipTextActive: { color: Colors.background },
  filterField: { marginTop: Spacing.sm, marginBottom: 0 },
  dateRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  dateField: { flex: 1, marginBottom: 0 },
  list: { padding: Spacing.lg, paddingBottom: 100 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: Spacing.xl },
  emptyText: { ...Typography.subheadline, color: Colors.textSecondary, textAlign: 'center', paddingHorizontal: Spacing.xl },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.separator },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
  quoteNumber: { ...Typography.headline, color: Colors.textPrimary, fontWeight: '700' },
  client: { ...Typography.subheadline, color: Colors.textSecondary, marginBottom: Spacing.xs },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  price: { ...Typography.title3, color: Colors.textPrimary, fontWeight: '700' },
  date: { ...Typography.caption1, color: Colors.textSecondary },
  actionsRow: { flexDirection: 'row', alignItems: 'center' },
  actionBtn: { paddingHorizontal: 14, paddingVertical: 12, justifyContent: 'center' },
  actionText: { ...Typography.footnote, color: '#ffffff', fontWeight: '700' },
  fab: { position: 'absolute', bottom: 28, right: 24, width: 58, height: 58, borderRadius: 29, backgroundColor: Colors.accent, justifyContent: 'center', alignItems: 'center', elevation: 10, shadowColor: Colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.45, shadowRadius: 12 },
  fabText: { fontSize: 28, color: Colors.onAccent, fontWeight: '300', lineHeight: 32 },
});
