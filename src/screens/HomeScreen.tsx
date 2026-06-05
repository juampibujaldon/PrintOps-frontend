// src/screens/HomeScreen.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  StatusBar,
  Animated,
  Image,
  SafeAreaView,
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { Colors, Radius, Spacing } from '../constants/theme';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TecnicoStackParamList } from '../navigation/TecnicoStack';
import { printerService } from '../services/printerService';

type NavProp = NativeStackNavigationProp<TecnicoStackParamList, 'TecnicoHome'>;

// ─── Tipos ──────────────────────────────────────────────────────────────────
type PrinterStatus = 'OPERATIVA' | 'EN_MANTENIMIENTO' | 'FUERA_DE_SERVICIO';

interface PrinterCard {
  id: string;
  name?: string | null;
  brand: string;
  model: string;
  serialNumber: string;
  status: PrinterStatus;
  photoUrl?: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<PrinterStatus, { label: string; color: string; icon: string }> = {
  OPERATIVA: { label: 'Operativa', color: Colors.statusOperativa, icon: '●' },
  EN_MANTENIMIENTO: { label: 'En Mantenimiento', color: Colors.statusMantenim, icon: '●' },
  FUERA_DE_SERVICIO: { label: 'Fuera de Servicio', color: Colors.statusFuera, icon: '●' },
};

// ─── Componente: StatusPill ──────────────────────────────────────────────────
function StatusPill({ status }: { status: PrinterStatus }) {
  const cfg = STATUS_CONFIG[status];
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (status === 'OPERATIVA') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 0.4, duration: 900, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [status]);

  return (
    <View style={[styles.statusPill, { borderColor: cfg.color + '40', backgroundColor: cfg.color + '18' }]}>
      <Animated.Text
        style={[styles.statusDot, { color: cfg.color, opacity: status === 'OPERATIVA' ? pulse : 1 }]}
      >
        {cfg.icon}
      </Animated.Text>
      <Text style={[styles.statusLabel, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

// ─── Componente: PrinterCardItem ─────────────────────────────────────────────
function PrinterCardItem({ printer, index }: { printer: PrinterCard; index: number }) {
  const translateY = useRef(new Animated.Value(30)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: 0, duration: 350, delay: index * 80, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 350, delay: index * 80, useNativeDriver: true }),
    ]).start();
  }, []);

  const hasPhoto = printer.photoUrl != null;

  return (
    <Animated.View style={{ transform: [{ translateY }], opacity }}>
      <TouchableOpacity style={styles.printerCard} activeOpacity={0.82}>
        {/* Accent left bar */}
        <View
          style={[styles.accentBar, { backgroundColor: STATUS_CONFIG[printer.status].color }]}
        />

        {/* Thumbnail / Placeholder */}
        <View style={styles.thumbnailWrapper}>
          {hasPhoto ? (
            <Image source={{ uri: printer.photoUrl! }} style={styles.thumbnail} />
          ) : (
            <View style={styles.thumbnailPlaceholder}>
              <Text style={styles.printerIcon}>🖨️</Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.cardInfo}>
          <Text style={styles.cardModel} numberOfLines={1}>
            {printer.name ? printer.name : printer.model}
          </Text>
          <Text style={styles.cardBrand} numberOfLines={1}>
            {printer.brand}
          </Text>
          <Text style={styles.cardSerial} numberOfLines={1}>
            S/N: {printer.serialNumber}
          </Text>
          <StatusPill status={printer.status} />
        </View>

        {/* Chevron */}
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Componente: SummaryBar ──────────────────────────────────────────────────
function SummaryBar({ printers }: { printers: PrinterCard[] }) {
  const counts = {
    total: printers.length,
    operativas: printers.filter(p => p.status === 'OPERATIVA').length,
    mantenimiento: printers.filter(p => p.status === 'EN_MANTENIMIENTO').length,
    fuera: printers.filter(p => p.status === 'FUERA_DE_SERVICIO').length,
  };

  return (
    <View style={styles.summaryBar}>
      <SummaryStat label="Total" value={counts.total} color={Colors.textSecondary} />
      <View style={styles.summaryDivider} />
      <SummaryStat label="Operativas" value={counts.operativas} color={Colors.statusOperativa} />
      <View style={styles.summaryDivider} />
      <SummaryStat label="Mant." value={counts.mantenimiento} color={Colors.statusMantenim} />
      <View style={styles.summaryDivider} />
      <SummaryStat label="Fuera" value={counts.fuera} color={Colors.statusFuera} />
    </View>
  );
}

function SummaryStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.summaryStat}>
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

// ─── Screen Principal ────────────────────────────────────────────────────────
export default function HomeScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<NavProp>();
  const [printers, setPrinters] = useState<PrinterCard[]>([]);
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
  }, []);

  const handleAddPrinter = () => navigation.navigate('AddPrinter');

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      {/* ── Top Header ── */}
      <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
        <View>
          <Text style={styles.headerTitle}>PrintOps</Text>
          <Text style={styles.headerSub}>Panel de Control</Text>
        </View>
      </Animated.View>

      {/* ── User Badge ── */}
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

      {/* ── Summary Bar ── */}
      <SummaryBar printers={printers} />

      {/* ── Section Header ── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>INVENTARIO</Text>
        <TouchableOpacity onPress={handleAddPrinter} style={styles.addButton}>
          <Text style={styles.addButtonText}>+ Nueva</Text>
        </TouchableOpacity>
      </View>

      {/* ── Printer List ── */}
      <FlatList
        data={printers}
        keyExtractor={item => item.id}
        renderItem={({ item, index }) => (
          <PrinterCardItem printer={item} index={index} />
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

      {/* ── FAB ── */}
      <TouchableOpacity style={styles.fab} onPress={handleAddPrinter} activeOpacity={0.85}>
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ─── Estilos ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 0.5,
  },
  headerSub: {
    fontSize: 11,
    color: Colors.textSecondary,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 1,
  },
  logoutBtn: {
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  logoutBtnText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },

  // User Badge
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  userAvatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primaryGlow,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '800',
  },
  userEmail: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    maxWidth: 220,
  },
  userRole: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 2,
  },

  // Summary Bar
  summaryBar: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: Colors.surfaceBase,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    overflow: 'hidden',
  },
  summaryStat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  summaryLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: Colors.surfaceBorder,
    marginVertical: 8,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  addButton: {
    backgroundColor: Colors.primaryGlow,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addButtonText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },

  // List
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },

  // Printer Card
  printerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceBase,
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    overflow: 'hidden',
  },
  accentBar: {
    width: 3,
    alignSelf: 'stretch',
  },
  thumbnailWrapper: {
    margin: Spacing.md,
    marginLeft: 12,
  },
  thumbnail: {
    width: 68,
    height: 68,
    borderRadius: Radius.md,
  },
  thumbnailPlaceholder: {
    width: 68,
    height: 68,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  printerIcon: {
    fontSize: 30,
  },
  cardInfo: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingRight: Spacing.sm,
    gap: 3,
  },
  cardModel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: 0.2,
  },
  cardBrand: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  cardSerial: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontFamily: 'Courier New',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  chevron: {
    fontSize: 22,
    color: Colors.surfaceBorder,
    marginRight: 14,
    fontWeight: '300',
  },

  // Status Pill
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 5,
  },
  statusDot: {
    fontSize: 8,
    lineHeight: 12,
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // FAB
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
  fabText: {
    fontSize: 28,
    color: Colors.background,
    fontWeight: '300',
    lineHeight: 32,
  },

  // Empty State
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
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
