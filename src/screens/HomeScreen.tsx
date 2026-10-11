// src/screens/HomeScreen.tsx
import React, { useLayoutEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  StatusBar,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { Colors, Icons, Radius, Spacing, Typography } from '../constants/theme';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TecnicoStackParamList } from '../navigation/TecnicoStack';
import { printerService, PrinterResponse } from '../services/printerService';
import { workspaceService } from '../services/workspaceService';
import PrinterCard from '../components/home/PrinterCard';
import SummaryBar from '../components/home/SummaryBar';
import FiltersBar from '../components/home/FiltersBar';
import PressableScale from '../components/ui/PressableScale';
import TextField from '../components/ui/TextField';
import Button from '../components/ui/Button';
import { ClipboardList, LucideIcon, Plus, Printer, QrCode, UserPlus } from 'lucide-react-native';
import EmptyState from '../components/ui/EmptyState';

// Acción del header nativo: solo ícono, en color de acento.
function HeaderIcon({ Icon, label, onPress }: { Icon: LucideIcon; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({ opacity: pressed ? 0.4 : 1, paddingHorizontal: 6 })}
    >
      <Icon color={Colors.primary} size={22} strokeWidth={Icons.strokeWidth} />
    </Pressable>
  );
}

type NavProp = NativeStackNavigationProp<TecnicoStackParamList, 'TecnicoHome'>;

export default function HomeScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<NavProp>();
  const [printers, setPrinters] = useState<PrinterResponse[]>([]);
  const [statusFilter, setStatusFilter] = useState<'ALL' | PrinterResponse['status']>('ALL');
  const [search, setSearch] = useState('');
  const [inviteVisible, setInviteVisible] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSending, setInviteSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadPrinters = React.useCallback(async () => {
    try {
      const data = await printerService.getAllPrinters();
      setPrinters(data);
    } catch (error: any) {
      // Antes el error se tragaba en silencio y la lista quedaba vacía.
      Alert.alert('No se pudieron cargar las impresoras', error?.response?.data?.message || 'Revisá tu conexión e intentá de nuevo.');
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadPrinters();
    }, [loadPrinters])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPrinters();
    setRefreshing(false);
  };

  const filteredPrinters = useMemo(() => {
    return printers.filter(p => {
      if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return [p.name, p.brand, p.model, p.serialNumber, p.location]
        .some(field => (field ?? '').toLowerCase().includes(q));
    });
  }, [printers, statusFilter, search]);

  const handleAddPrinter = () => navigation.navigate('AddPrinter');
  const handleOpenPrinter = (printer: PrinterResponse) => navigation.navigate('PrinterDetail', { printer });

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerActions}>
          <HeaderIcon Icon={ClipboardList} label="Órdenes" onPress={() => navigation.navigate('OrdersList')} />
          {user?.role === 'MANAGER' ? (
            <HeaderIcon Icon={UserPlus} label="Invitar técnico" onPress={handleInvite} />
          ) : null}
          <HeaderIcon Icon={QrCode} label="Escanear QR" onPress={() => navigation.navigate('ScanPrinter')} />
          <HeaderIcon Icon={Plus} label="Nueva impresora" onPress={() => navigation.navigate('AddPrinter')} />
        </View>
      ),
    });
  }, [navigation, user?.role]);

  const handleInvite = () => {
    setInviteEmail('');
    setInviteVisible(true);
  };

  const sendInvite = async () => {
    const email = inviteEmail.trim();
    if (!email) return;
    setInviteSending(true);
    try {
      const res = await workspaceService.invite(email);
      setInviteVisible(false);
      Alert.alert(res.emailSent ? 'Invitación enviada' : 'No se pudo enviar el email', res.message);
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'No se pudo invitar');
    } finally {
      setInviteSending(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      <SummaryBar printers={printers} />

      <FiltersBar
        statusFilter={statusFilter}
        onStatusFilter={setStatusFilter}
        search={search}
        onSearch={setSearch}
      />

      <FlatList
        data={filteredPrinters}
        keyExtractor={item => String(item.id)}
        renderItem={({ item, index }) => (
          <PrinterCard printer={item} index={index} onPress={() => handleOpenPrinter(item)} />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.textTertiary} />}
        ListEmptyComponent={
          printers.length === 0 ? (
            <EmptyState
              icon={<Printer color={Colors.textTertiary} size={44} strokeWidth={1.5} />}
              title="Sin impresoras"
              description="Agregá tu primera impresora para empezar a gestionar su mantenimiento."
              action={<Button title="Agregar impresora" variant="tinted" onPress={handleAddPrinter} />}
            />
          ) : (
            <EmptyState title="Sin resultados" description="Ninguna impresora coincide con los filtros." />
          )
        }
      />

      <Modal visible={inviteVisible} animationType="fade" transparent onRequestClose={() => setInviteVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Invitar técnico</Text>
            <TextField
              placeholder="Email del técnico"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={inviteEmail}
              onChangeText={setInviteEmail}
            />
            <View style={styles.modalActions}>
              <PressableScale
                style={styles.modalCancel}
                onPress={() => setInviteVisible(false)}
                disabled={inviteSending}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </PressableScale>
              <Button title="Enviar" onPress={sendInvite} loading={inviteSending} style={styles.modalButton} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}


const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xxl,
    flexGrow: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
  },
  modalTitle: {
    ...Typography.title3,
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    alignItems: 'center',
  },
  modalCancel: {
    padding: Spacing.md,
  },
  modalCancelText: {
    ...Typography.body,
    color: Colors.primary,
  },
  modalButton: {
    paddingHorizontal: Spacing.xl,
  },
});
