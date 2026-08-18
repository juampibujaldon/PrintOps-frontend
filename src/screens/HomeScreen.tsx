// src/screens/HomeScreen.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  StatusBar,
  Animated,
  SafeAreaView,
  Alert,
  Modal,
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { Colors, Radius, Shadows, Spacing, Typography } from '../constants/theme';
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

type NavProp = NativeStackNavigationProp<TecnicoStackParamList, 'TecnicoHome'>;

export default function HomeScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<NavProp>();
  const [printers, setPrinters] = useState<PrinterResponse[]>([]);
  const [statusFilter, setStatusFilter] = useState<'ALL' | PrinterResponse['status']>('ALL');
  const [brandFilter, setBrandFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [inviteVisible, setInviteVisible] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSending, setInviteSending] = useState(false);
  const headerOpacity = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    React.useCallback(() => {
      const loadPrinters = async () => {
        try {
          const data = await printerService.getAllPrinters();
          setPrinters(data);
        } catch (error) {
          console.error('Error fetching printers', error);
        }
      };
      loadPrinters();
    }, [])
  );

  useEffect(() => {
    Animated.timing(headerOpacity, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, [headerOpacity]);

  const filteredPrinters = useMemo(() => {
    return printers.filter(p => {
      if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
      if (brandFilter && !p.brand.toLowerCase().includes(brandFilter.toLowerCase())) return false;
      if (locationFilter && !(p.location ?? '').toLowerCase().includes(locationFilter.toLowerCase())) return false;
      return true;
    });
  }, [printers, statusFilter, brandFilter, locationFilter]);

  const handleAddPrinter = () => navigation.navigate('AddPrinter');
  const handleScan = () => navigation.navigate('ScanPrinter');
  const handleOpenOrders = () => navigation.navigate('OrdersList');
  const handleOpenPrinter = (printer: PrinterResponse) => navigation.navigate('PrinterDetail', { printer });

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
      Alert.alert('Invitación enviada', res.message + (res.inviteToken ? `\nCódigo: ${res.inviteToken}` : ''));
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'No se pudo invitar');
    } finally {
      setInviteSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
        <View>
          <Text style={styles.headerTitle}>PrintOps</Text>
          <Text style={styles.headerSub}>Panel de Control</Text>
        </View>
        <View style={styles.headerActions}>
          <HeaderButton label="Órdenes" onPress={handleOpenOrders} />
          {user?.role === 'MANAGER' && <HeaderButton label="Invitar" onPress={handleInvite} />}
          <HeaderButton label="QR" onPress={handleScan} />
        </View>
      </Animated.View>

      <View style={styles.userBadge}>
        <View style={styles.userAvatarCircle}>
          <Text style={styles.userAvatarText}>
            {user?.email?.charAt(0).toUpperCase() ?? '?'}
          </Text>
        </View>
        <View>
          <Text style={styles.userEmail} numberOfLines={1}>{user?.email}</Text>
          <Text style={styles.userRole}>{user?.role ?? 'TÉCNICO'}</Text>
        </View>
      </View>

      <SummaryBar printers={printers} />

      <FiltersBar
        statusFilter={statusFilter}
        onStatusFilter={setStatusFilter}
        brandFilter={brandFilter}
        onBrandFilter={setBrandFilter}
        locationFilter={locationFilter}
        onLocationFilter={setLocationFilter}
      />

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Inventario</Text>
        <PressableScale style={styles.addButton} onPress={handleAddPrinter}>
          <Text style={styles.addButtonText}>+ Nueva</Text>
        </PressableScale>
      </View>

      <FlatList
        data={filteredPrinters}
        keyExtractor={item => String(item.id)}
        renderItem={({ item, index }) => (
          <PrinterCard printer={item} index={index} onPress={() => handleOpenPrinter(item)} />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🖨️</Text>
            <Text style={styles.emptyTitle}>Sin impresoras registradas</Text>
            <Text style={styles.emptySubtitle}>
              Tocá "+ Nueva" para agregar tu primera impresora al inventario.
            </Text>
          </View>
        }
      />

      <PressableScale style={styles.fab} onPress={handleAddPrinter} scaleTo={0.94}>
        <Text style={styles.fabText}>＋</Text>
      </PressableScale>

      <Modal visible={inviteVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
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
              <Button title="Enviar invitación" onPress={sendInvite} loading={inviteSending} style={styles.modalButton} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function HeaderButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <PressableScale style={styles.scanButton} onPress={onPress}>
      <Text style={styles.scanButtonText}>{label}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  headerTitle: {
    ...Typography.title2,
    color: Colors.textPrimary,
    fontWeight: '800',
  },
  headerSub: {
    ...Typography.labelUppercase,
    color: Colors.textTertiary,
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  scanButton: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.separator,
    borderRadius: Radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  scanButtonText: {
    ...Typography.caption1,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.separator,
  },
  userAvatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    ...Typography.headline,
    color: Colors.accent,
    fontWeight: '800',
  },
  userEmail: {
    ...Typography.callout,
    color: Colors.textPrimary,
    fontWeight: '600',
    maxWidth: 220,
  },
  userRole: {
    ...Typography.labelUppercase,
    color: Colors.accent,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.labelUppercase,
    color: Colors.textTertiary,
  },
  addButton: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.separator,
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addButtonText: {
    ...Typography.caption1,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Colors.textPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.floating,
  },
  fabText: {
    fontSize: 28,
    color: Colors.background,
    fontWeight: '300',
    lineHeight: 32,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: Spacing.xl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    ...Typography.headline,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...Typography.subheadline,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  modalTitle: {
    ...Typography.title3,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
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
    ...Typography.subheadline,
    color: Colors.accent,
    fontWeight: '600',
  },
  modalButton: {
    paddingHorizontal: 16,
  },
});
