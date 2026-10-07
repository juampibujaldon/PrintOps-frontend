import React, { useCallback, useState, useEffect, useRef } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Calendar, X, Plus, FileX } from 'lucide-react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Radius, Spacing, Typography, Shadows } from '../constants/theme';
import { TecnicoStackParamList } from '../navigation/TecnicoStack';
import { quoteService } from '../services/quoteService';
import {
  Quote,
  QuoteStatus,
  QUOTE_STATUS_LABELS,
} from '../types/quote';
import Badge from '../components/ui/Badge';
import TextField from '../components/ui/TextField';
import PressableScale from '../components/ui/PressableScale';
import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import Skeleton from '../components/ui/Skeleton';
import ScreenHeader from '../components/ui/ScreenHeader';

type Props = NativeStackScreenProps<TecnicoStackParamList, 'QuoteHistory'>;

const money = (v: number) => `$${v.toFixed(2)}`;

const STATUS_FILTERS: Array<{ value: QuoteStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'Todos' },
  { value: 'DRAFT', label: 'Borrador' },
  { value: 'SENT', label: 'Enviado' },
  { value: 'ACCEPTED', label: 'Aceptado' },
  { value: 'REJECTED', label: 'Rechazado' },
];

const getStatusColors = (status: QuoteStatus) => {
  switch (status) {
    case 'ACCEPTED': return { bg: Colors.successBg, text: Colors.successText };
    case 'REJECTED': return { bg: Colors.errorBg, text: Colors.errorText };
    case 'SENT': return { bg: Colors.infoBg, text: Colors.infoText };
    default: return { bg: Colors.separator, text: Colors.textSecondary };
  }
};

export default function QuoteHistoryScreen({ navigation }: Props) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | 'ALL'>('ALL');
  const [clientFilter, setClientFilter] = useState('');
  const [query, setQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [showFrom, setShowFrom] = useState(false);
  const [showTo, setShowTo] = useState(false);

  const requestCounter = useRef(0);

  useFocusEffect(
    React.useCallback(() => {
      navigation.setOptions({ headerShown: false });
    }, [navigation])
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      setQuery(clientFilter);
    }, 400);
    return () => clearTimeout(timeout);
  }, [clientFilter]);

  const load = useCallback(async (isRefresh = false) => {
    const reqId = ++requestCounter.current;
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      
      const data = await quoteService.list({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        clientName: query.trim() || undefined,
        from: fromDate.trim() || undefined,
        to: toDate.trim() || undefined,
      });
      if (reqId === requestCounter.current) {
        setQuotes(data);
      }
    } catch (e: any) {
      if (reqId === requestCounter.current) {
        const msg = e?.response?.data?.message || 'No se pudieron cargar los presupuestos';
        setError(msg);
        if (quotes.length > 0) {
          Alert.alert('Error', msg);
        }
      }
    } finally {
      if (reqId === requestCounter.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [statusFilter, query, fromDate, toDate]);

  const onRefresh = useCallback(() => {
    load(true);
  }, [load]);

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
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'No se pudo cambiar el estado');
    }
  };

  const duplicate = async (id: number) => {
    try {
      const q = await quoteService.duplicate(id);
      navigation.navigate('QuoteCalculator', { quoteId: q.id, title: `Basado en ${q.quoteNumber}` });
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'No se pudo duplicar');
    }
  };

  const removeQuote = async (id: number) => {
    try {
      await quoteService.remove(id);
      load();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'No se pudo eliminar');
    }
  };

  const renderActions = (quote: Quote) => {
    const actions: Array<{ label: string; color: string; onPress: () => void }> = [];
    if (quote.status === 'DRAFT') {
      actions.push({ label: 'Enviar', color: Colors.infoBg, onPress: () => changeStatus(quote.id, 'SENT') });
      actions.push({ label: 'Eliminar', color: Colors.errorBg, onPress: () => removeQuote(quote.id) });
    } else if (quote.status === 'SENT') {
      actions.push({ label: 'Aceptar', color: Colors.successBg, onPress: () => changeStatus(quote.id, 'ACCEPTED') });
      actions.push({ label: 'Rechazar', color: Colors.errorBg, onPress: () => changeStatus(quote.id, 'REJECTED') });
    }
    actions.push({ label: 'Duplicar', color: Colors.separator, onPress: () => duplicate(quote.id) });

    return (
      <View style={styles.actionsRow}>
        {actions.map(a => (
          <TouchableOpacity key={a.label} style={[styles.actionBtn, { backgroundColor: a.color }]} onPress={a.onPress}>
            <Text style={[styles.actionText, { color: Colors.textPrimary }]}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderCard = ({ item, index }: { item: Quote; index: number }) => {
    const statusColors = getStatusColors(item.status);
    return (
      <Animated.View entering={FadeInDown.delay(index * 50).springify().damping(20)}>
        <ReanimatedSwipeable renderRightActions={() => renderActions(item)} overshootRight={false}>
          <PressableScale
            scaleTo={0.98}
            onPress={() => navigation.navigate('QuoteCalculator', { quoteId: item.id })}
          >
            <Card style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Text style={styles.client} numberOfLines={1}>
                    {item.clientName || 'Sin cliente'}
                  </Text>
                  <Text style={styles.jobDesc} numberOfLines={1}>
                    {item.jobDescription || item.quoteNumber}
                  </Text>
                </View>
                <Text style={styles.price}>{money(item.totalPrice)}</Text>
              </View>
              <View style={styles.cardFooter}>
                <Badge label={QUOTE_STATUS_LABELS[item.status]} bgColor={statusColors.bg} textColor={statusColors.text} />
                <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString()}</Text>
              </View>
            </Card>
          </PressableScale>
        </ReanimatedSwipeable>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Historial de Presupuestos" />
      
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

      {loading && quotes.length === 0 && !error ? (
        <View style={styles.skeletonContainer}>
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} style={styles.skeletonCard} />
          ))}
        </View>
      ) : error && quotes.length === 0 ? (
        <ErrorState error={error} onRetry={() => load()} />
      ) : (
        <FlatList
          data={quotes}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={renderCard}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
          ListEmptyComponent={
            <EmptyState 
              icon={<FileX color={Colors.textTertiary} size={48} />}
              title="Sin presupuestos"
              description="Todavía no tenés presupuestos guardados — creá el primero"
            />
          }
        />
      )}

      <PressableScale
        style={styles.fab}
        scaleTo={0.9}
        onPress={() => navigation.navigate('QuoteCalculator', {})}
        accessibilityLabel="Crear nuevo presupuesto"
        accessibilityRole="button"
      >
        <Plus color={Colors.onPrimary} size={28} />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  filters: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  chipsScroll: { marginHorizontal: -Spacing.lg },
  chipsRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm },
  chip: { paddingHorizontal: Spacing.lg, minHeight: 36, justifyContent: 'center', borderRadius: Radius.full, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.separator },
  chipActive: { backgroundColor: Colors.textPrimary, borderColor: Colors.textPrimary },
  chipText: { ...Typography.footnote, color: Colors.textSecondary, fontWeight: '600' },
  chipTextActive: { color: Colors.surface },
  filterField: { marginTop: Spacing.sm, marginBottom: 0 },
  dateRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm, alignItems: 'center' },
  datePickerBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.separator, borderRadius: Radius.md, paddingHorizontal: Spacing.sm, height: 44, gap: Spacing.sm },
  dateText: { ...Typography.body, color: Colors.textPrimary, ...Typography.tabular },
  datePlaceholder: { ...Typography.body, color: Colors.textTertiary },
  clearDateBtn: { justifyContent: 'center', alignItems: 'center', padding: Spacing.xs },
  
  list: { padding: Spacing.lg, paddingBottom: 100 },
  skeletonContainer: { padding: Spacing.lg },
  skeletonCard: { height: 100, marginBottom: Spacing.md, borderRadius: Radius.lg },
  
  card: { marginBottom: Spacing.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.sm },
  cardHeaderLeft: { flex: 1, marginRight: Spacing.md },
  client: { ...Typography.headline, color: Colors.textPrimary, marginBottom: 2 },
  jobDesc: { ...Typography.subheadline, color: Colors.textSecondary },
  price: { ...Typography.title, color: Colors.textPrimary, ...Typography.tabular },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.xs },
  date: { ...Typography.caption, color: Colors.textTertiary, ...Typography.tabular },
  
  actionsRow: { flexDirection: 'row', alignItems: 'stretch', height: '100%', paddingBottom: Spacing.md },
  actionBtn: { paddingHorizontal: Spacing.lg, justifyContent: 'center', alignItems: 'center' },
  actionText: { ...Typography.footnote, fontWeight: '700' },
  
  fab: { position: 'absolute', bottom: 28, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', ...Shadows.floatingLight },
});
