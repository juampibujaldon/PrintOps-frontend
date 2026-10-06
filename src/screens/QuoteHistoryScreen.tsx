// src/screens/QuoteHistoryScreen.tsx
import React, { useCallback, useState, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Calendar, X, Plus } from 'lucide-react-native';
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
  const [query, setQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [showFrom, setShowFrom] = useState(false);
  const [showTo, setShowTo] = useState(false);

  const requestCounter = useRef(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setQuery(clientFilter);
    }, 400);
    return () => clearTimeout(timeout);
  }, [clientFilter]);

  const load = useCallback(async () => {
    const reqId = ++requestCounter.current;
    try {
      setLoading(true);
      const data = await quoteService.list({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        clientName: query.trim() || undefined,
        from: fromDate.trim() || undefined,
        to: toDate.trim() || undefined,
      });
      if (reqId === requestCounter.current) {
        setQuotes(data);
      }
    } catch (error: any) {
      if (reqId === requestCounter.current) {
        Alert.alert('Error', error?.response?.data?.message || 'No se pudieron cargar los presupuestos');
      }
    } finally {
      if (reqId === requestCounter.current) {
        setLoading(false);
      }
    }
  }, [statusFilter, query, fromDate, toDate]);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    React.useCallback(() => {
      load();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const onFromChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowFrom(Platform.OS === 'ios');
    if (selectedDate) {
      const yyyy = selectedDate.getFullYear();
      const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const dd = String(selectedDate.getDate()).padStart(2, '0');
      const formatted = `${yyyy}-${mm}-${dd}`;
      if (toDate && formatted > toDate) {
        Alert.alert('Error', 'La fecha "Desde" no puede ser posterior a "Hasta"');
        return;
      }
      setFromDate(formatted);
    }
  };

  const onToChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowTo(Platform.OS === 'ios');
    if (selectedDate) {
      const yyyy = selectedDate.getFullYear();
      const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const dd = String(selectedDate.getDate()).padStart(2, '0');
      const formatted = `${yyyy}-${mm}-${dd}`;
      if (fromDate && formatted < fromDate) {
        Alert.alert('Error', 'La fecha "Hasta" no puede ser anterior a "Desde"');
        return;
      }
      setToDate(formatted);
    }
  };

  const clearDates = () => {
    setFromDate('');
    setToDate('');
  };

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
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.chipsScroll} 
          contentContainerStyle={styles.chipsRow}
        >
          {STATUS_FILTERS.map(f => (
            <PressableScale
              key={f.value}
              style={[styles.chip, statusFilter === f.value && styles.chipActive]}
              onPress={() => setStatusFilter(f.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: statusFilter === f.value }}
            >
              <Text style={[styles.chipText, statusFilter === f.value && styles.chipTextActive]}>{f.label}</Text>
            </PressableScale>
          ))}
        </ScrollView>
        <TextField
          placeholder="Buscar por cliente"
          value={clientFilter}
          onChangeText={setClientFilter}
          containerStyle={styles.filterField}
        />
        <View style={styles.dateRow}>
          <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowFrom(true)}>
            <Calendar color={Colors.textSecondary} size={18} />
            <Text style={fromDate ? styles.dateText : styles.datePlaceholder}>
              {fromDate ? fromDate.split('-').reverse().join('/') : 'Desde'}
            </Text>
          </TouchableOpacity>
          {showFrom && (
            <DateTimePicker
              value={fromDate ? new Date(fromDate + 'T00:00:00') : new Date()}
              mode="date"
              display="default"
              onChange={onFromChange}
            />
          )}

          <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowTo(true)}>
            <Calendar color={Colors.textSecondary} size={18} />
            <Text style={toDate ? styles.dateText : styles.datePlaceholder}>
              {toDate ? toDate.split('-').reverse().join('/') : 'Hasta'}
            </Text>
          </TouchableOpacity>
          {showTo && (
            <DateTimePicker
              value={toDate ? new Date(toDate + 'T00:00:00') : new Date()}
              mode="date"
              display="default"
              onChange={onToChange}
            />
          )}

          {(fromDate !== '' || toDate !== '') && (
            <TouchableOpacity style={styles.clearDateBtn} onPress={clearDates}>
              <X color={Colors.textSecondary} size={20} />
            </TouchableOpacity>
          )}
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
  chipsScroll: { marginHorizontal: -Spacing.lg },
  chipsRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm },
  chip: { paddingHorizontal: 16, minHeight: 44, justifyContent: 'center', borderRadius: Radius.full, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.separator },
  chipActive: { backgroundColor: Colors.textPrimary, borderColor: Colors.textPrimary },
  chipText: { ...Typography.footnote, color: Colors.textSecondary, fontWeight: '600' },
  chipTextActive: { color: Colors.background },
  filterField: { marginTop: Spacing.sm, marginBottom: 0 },
  dateRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm, alignItems: 'center' },
  datePickerBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.separator, borderRadius: Radius.md, paddingHorizontal: Spacing.sm, height: 44, gap: Spacing.sm },
  dateText: { ...Typography.body, color: Colors.textPrimary },
  datePlaceholder: { ...Typography.body, color: Colors.textTertiary },
  clearDateBtn: { justifyContent: 'center', alignItems: 'center', padding: Spacing.xs },
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
