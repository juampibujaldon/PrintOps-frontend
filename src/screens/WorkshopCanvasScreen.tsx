import React, { useState, useCallback, useMemo, useRef } from 'react';
import { View, StyleSheet, Text, LayoutChangeEvent, TouchableOpacity, Alert, AlertButton, ScrollView } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, FadeIn } from 'react-native-reanimated';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { LayoutGrid, List, Locate, Pencil, Plus } from 'lucide-react-native';
import Svg from 'react-native-svg';
import { Colors, Typography, Spacing, Radius, Icons, Shadows } from '../constants/theme';
import { PRINTER_STATUS, daysUntilMaintenance } from '../constants/printers';
import { canvasService, CanvasLayout } from '../services/canvasService';
import { printerService, PrinterResponse } from '../services/printerService';
import { orderService, OrderStatus } from '../services/orderService';
import ErrorState from '../components/ui/ErrorState';
import EmptyState from '../components/ui/EmptyState';
import ScreenHeader from '../components/ui/ScreenHeader';
import Skeleton from '../components/ui/Skeleton';
import PressableScale from '../components/ui/PressableScale';
import CanvasNodeItem from '../components/canvas/CanvasNodeItem';
import CanvasEdgeItem from '../components/canvas/CanvasEdgeItem';
import DotGrid from '../components/canvas/DotGrid';
import WorkshopSummary, { WorkshopCounts, WorkshopFilter } from '../components/canvas/WorkshopSummary';
import PrinterQuickSheet from '../components/canvas/PrinterQuickSheet';
import { useAuth } from '../hooks/useAuth';

const OPEN_ORDER_STATUSES: OrderStatus[] = ['PENDING', 'IN_PROGRESS', 'IN_REVIEW'];

const isMaintenanceDue = (p: PrinterResponse) => {
  const days = daysUntilMaintenance(p.nextMaintenanceDate);
  return days != null && days <= 7;
};

export default function WorkshopCanvasScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const isManager = user?.role === 'MANAGER';
  const isTecnico = user?.role === 'TECNICO';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [editMode, setEditMode] = useState(false);
  const [viewMode, setViewMode] = useState<'canvas' | 'list'>('canvas');
  const [filter, setFilter] = useState<WorkshopFilter | null>(null);
  const [selected, setSelected] = useState<PrinterResponse | null>(null);
  // Cambia para remontar los nodos al cancelar la edición (resetea posiciones).
  const [canvasKey, setCanvasKey] = useState(0);

  const [printers, setPrinters] = useState<PrinterResponse[]>([]);
  const [layout, setLayout] = useState<CanvasLayout>({ nodes: [], edges: [] });
  const [openOrdersByPrinter, setOpenOrdersByPrinter] = useState<Record<number, number>>({});

  const savedLayout = useRef<CanvasLayout>({ nodes: [], edges: [] });
  const hasLoaded = useRef(false);
  const editModeRef = useRef(false);
  editModeRef.current = editMode;

  const load = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const [fetchedPrinters, fetchedLayout, orders] = await Promise.all([
        printerService.getAllPrinters(),
        canvasService.getCanvasLayout(),
        // Las órdenes son información extra: si fallan, el taller se muestra igual.
        orderService.listOrders().catch(() => []),
      ]);
      setPrinters(fetchedPrinters);
      // No pisar el plano mientras el usuario lo está editando.
      if (!editModeRef.current) {
        setLayout(fetchedLayout);
        savedLayout.current = fetchedLayout;
      }
      const counts: Record<number, number> = {};
      orders
        .filter(o => OPEN_ORDER_STATUSES.includes(o.status))
        .forEach(o => { counts[o.printerId] = (counts[o.printerId] ?? 0) + 1; });
      setOpenOrdersByPrinter(counts);
      hasLoaded.current = true;
    } catch (e: any) {
      if (!silent) setError(e?.response?.data?.message || e.message || 'Error al cargar el taller');
    } finally {
      setLoading(false);
    }
  }, []);

  // Primera carga con skeleton; al volver a la pantalla, refresco silencioso.
  useFocusEffect(
    useCallback(() => {
      load(hasLoaded.current);
    }, [load]),
  );

  const counts: WorkshopCounts = useMemo(() => ({
    operative: printers.filter(p => p.status === 'OPERATIVE').length,
    maintenance: printers.filter(p => p.status === 'MAINTENANCE').length,
    outOfService: printers.filter(p => p.status === 'OUT_OF_SERVICE').length,
    due: printers.filter(isMaintenanceDue).length,
    openOrders: Object.values(openOrdersByPrinter).reduce((a, b) => a + b, 0),
  }), [printers, openOrdersByPrinter]);

  const matchesFilter = useCallback((p: PrinterResponse) => {
    switch (filter) {
      case null: return true;
      case 'DUE': return isMaintenanceDue(p);
      case 'ORDERS': return (openOrdersByPrinter[p.id] ?? 0) > 0;
      default: return p.status === filter;
    }
  }, [filter, openOrdersByPrinter]);

  // Pan & Zoom for the whole canvas
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // Shared positions for nodes to drive the SVG lines
  const positions = useSharedValue<Record<number, { x: number, y: number }>>({});

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.max(0.5, Math.min(3, savedScale.value * e.scale));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture);

  const canvasAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value }
    ]
  }));

  const resetView = () => {
    scale.value = withTiming(1);
    savedScale.value = 1;
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  };

  const handleDragEnd = useCallback((printerId: number, normalizedX: number, normalizedY: number) => {
    if (!editMode) return;
    setLayout(prev => ({
      ...prev,
      nodes: prev.nodes.map(n => n.printerId === printerId ? { ...n, x: normalizedX, y: normalizedY } : n)
    }));
  }, [editMode]);

  const startEditing = () => {
    if (!isManager) return;
    setSelected(null);
    setFilter(null);
    setEditMode(true);
  };

  const cancelEditing = () => {
    setLayout(savedLayout.current);
    positions.value = {};
    setCanvasKey(k => k + 1);
    setEditMode(false);
  };

  const saveLayout = async () => {
    try {
      setSaving(true);
      const saved = await canvasService.updateCanvasLayout(layout);
      setLayout(saved);
      savedLayout.current = saved;
      setEditMode(false);
    } catch (e: any) {
      Alert.alert('Error', 'No se pudo guardar el plano');
    } finally {
      setSaving(false);
    }
  };

  const handleAddPrinter = () => {
    const unplaced = printers.filter(p => !layout.nodes.some(n => n.printerId === p.id));
    if (unplaced.length === 0) {
      Alert.alert('Sin impresoras', 'Todas tus impresoras ya están en el plano.');
      return;
    }

    const buttons: AlertButton[] = unplaced.map(p => ({
      text: p.name || `${p.brand} ${p.model}`,
      onPress: () => {
        setLayout(prev => ({
          ...prev,
          nodes: [...prev.nodes, { printerId: p.id, x: 0.5, y: 0.5 }]
        }));
      },
    }));
    buttons.push({ text: 'Cancelar', style: 'cancel' });

    Alert.alert('Agregar impresora', 'Elegí la impresora a ubicar en el plano', buttons);
  };

  const openDetail = (printer: PrinterResponse) => {
    setSelected(null);
    navigation.navigate('InicioStack', { screen: 'PrinterDetail', params: { printer } });
  };

  const createOrder = (printer: PrinterResponse) => {
    setSelected(null);
    navigation.navigate('InicioStack', { screen: 'CreateOrder', params: { printer } });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Taller" />
        <View style={styles.content}>
          <View style={styles.skeletonRow}>
            {[0, 1, 2].map(i => <Skeleton key={i} style={styles.skeletonCard} />)}
          </View>
          <Skeleton style={styles.skeletonCanvas} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Taller" />
        <ErrorState error={error} onRetry={() => load()} />
      </View>
    );
  }

  const placedNodes = layout.nodes.filter(n => printers.some(p => p.id === n.printerId));
  const listPrinters = printers.filter(matchesFilter);

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Taller"
        rightContent={
          <View style={styles.viewToggle}>
            <ToggleButton active={viewMode === 'canvas'} onPress={() => setViewMode('canvas')} label="Plano">
              <LayoutGrid color={viewMode === 'canvas' ? Colors.textPrimary : Colors.textSecondary} size={Icons.sm} strokeWidth={2} />
            </ToggleButton>
            <ToggleButton active={viewMode === 'list'} onPress={() => setViewMode('list')} label="Lista" disabled={editMode}>
              <List color={viewMode === 'list' ? Colors.textPrimary : Colors.textSecondary} size={Icons.sm} strokeWidth={2} />
            </ToggleButton>
          </View>
        }
      />

      <View style={styles.content}>
        {!editMode && <WorkshopSummary counts={counts} active={filter} onSelect={setFilter} />}

        {editMode && (
          <Animated.View entering={FadeIn.duration(200)} style={styles.editBanner}>
            <Pencil color={Colors.onPrimary} size={Icons.sm} strokeWidth={2} />
            <Text style={styles.editBannerText}>Modo edición: arrastrá las impresoras para ubicarlas</Text>
          </Animated.View>
        )}

        {viewMode === 'canvas' ? (
          <View
            style={[styles.canvasBorder, editMode && styles.canvasBorderEditing]}
            onLayout={(e: LayoutChangeEvent) => {
              setCanvasSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height });
            }}
          >
            <GestureDetector gesture={composedGesture}>
              <Animated.View style={[styles.canvasInner, canvasAnimatedStyle]}>
                {canvasSize.width > 0 && (
                  <>
                    <DotGrid width={canvasSize.width} height={canvasSize.height} />
                    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
                      {layout.edges.map(edge => (
                        <CanvasEdgeItem
                          key={edge.id}
                          fromId={edge.fromId}
                          toId={edge.toId}
                          positions={positions}
                        />
                      ))}
                    </Svg>
                    {placedNodes.map(node => {
                      const p = printers.find(x => x.id === node.printerId)!;
                      return (
                        <CanvasNodeItem
                          key={`${canvasKey}-${node.printerId}`}
                          printer={p}
                          initialX={node.x}
                          initialY={node.y}
                          canvasWidth={canvasSize.width}
                          canvasHeight={canvasSize.height}
                          onDragEnd={(x, y) => handleDragEnd(p.id, x, y)}
                          onPress={() => setSelected(p)}
                          positions={positions}
                          disabled={!editMode}
                          dimmed={!matchesFilter(p)}
                          openOrders={openOrdersByPrinter[p.id] ?? 0}
                        />
                      );
                    })}
                  </>
                )}
              </Animated.View>
            </GestureDetector>

            {placedNodes.length === 0 && (
              <View style={styles.canvasEmpty} pointerEvents="box-none">
                <EmptyState
                  icon={<LayoutGrid color={Colors.textTertiary} size={40} strokeWidth={1.5} />}
                  title="El plano está vacío"
                  description={isManager
                    ? 'Tocá "Editar plano" y agregá tus impresoras para armar el mapa del taller.'
                    : 'Un administrador todavía no ubicó las impresoras en el plano.'}
                />
              </View>
            )}

            <TouchableOpacity onPress={resetView} style={styles.recenterBtn} accessibilityRole="button" accessibilityLabel="Centrar plano">
              <Locate color={Colors.textSecondary} size={Icons.md} strokeWidth={Icons.strokeWidth} />
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.listView} showsVerticalScrollIndicator={false}>
            {listPrinters.length === 0 ? (
              <EmptyState title="Sin impresoras" description={filter ? 'Ninguna impresora coincide con el filtro.' : 'Todavía no hay impresoras registradas.'} />
            ) : (
              listPrinters.map(p => {
                const status = PRINTER_STATUS[p.status] ?? { label: 'Sin estado', color: Colors.statusUnknown };
                const orders = openOrdersByPrinter[p.id] ?? 0;
                return (
                  <PressableScale
                    key={p.id}
                    scaleTo={0.98}
                    style={styles.listItem}
                    onPress={() => setSelected(p)}
                    accessibilityRole="button"
                    accessibilityLabel={`Impresora ${p.name || p.model}, estado: ${status.label}`}
                  >
                    <View style={[styles.listStatusBar, { backgroundColor: status.color }]} />
                    <View style={styles.flex}>
                      <Text style={styles.listTitle} numberOfLines={1}>{p.name || `${p.brand} ${p.model}`}</Text>
                      <Text style={styles.listSubtitle} numberOfLines={1}>
                        {[p.location, orders > 0 ? `${orders} ${orders === 1 ? 'orden abierta' : 'órdenes abiertas'}` : null].filter(Boolean).join(' · ') || p.serialNumber}
                      </Text>
                    </View>
                    <Text style={[styles.listStatusText, { color: status.color }]}>{status.label}</Text>
                  </PressableScale>
                );
              })
            )}
          </ScrollView>
        )}

        {isManager && viewMode === 'canvas' && (
          <View style={styles.toolbar}>
            {editMode ? (
              <>
                <TouchableOpacity style={styles.btnGhost} onPress={cancelEditing} disabled={saving}>
                  <Text style={styles.btnGhostText}>Cancelar</Text>
                </TouchableOpacity>
                <View style={styles.flex} />
                <TouchableOpacity style={styles.btnSecondary} onPress={handleAddPrinter}>
                  <Plus color={Colors.primary} size={Icons.sm} strokeWidth={2.25} />
                  <Text style={styles.btnSecondaryText}>Agregar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnPrimary} onPress={saveLayout} disabled={saving}>
                  <Text style={styles.btnPrimaryText}>{saving ? 'Guardando…' : 'Guardar'}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={styles.btnSecondary} onPress={startEditing}>
                <Pencil color={Colors.primary} size={Icons.sm} strokeWidth={2} />
                <Text style={styles.btnSecondaryText}>Editar plano</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      <PrinterQuickSheet
        printer={selected}
        openOrders={selected ? openOrdersByPrinter[selected.id] ?? 0 : 0}
        canCreateOrder={isTecnico}
        onClose={() => setSelected(null)}
        onOpenDetail={openDetail}
        onCreateOrder={createOrder}
      />
    </View>
  );
}

function ToggleButton({ active, onPress, label, disabled, children }: {
  active: boolean;
  onPress: () => void;
  label: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <TouchableOpacity
      style={[styles.toggleBtn, active && styles.toggleBtnActive, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active, disabled }}
    >
      {children}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  disabled: { opacity: 0.4 },
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1, paddingHorizontal: Spacing.md, paddingBottom: Spacing.md },

  skeletonRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  skeletonCard: { width: 136, height: 96, borderRadius: Radius.lg },
  skeletonCanvas: { flex: 1, borderRadius: Radius.lg },

  editBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
  },
  editBannerText: { ...Typography.footnote, color: Colors.onPrimary, fontWeight: '600', flex: 1 },

  canvasBorder: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.separator,
    // Off-white levemente frío: el cuadriculado de puntos le da textura.
    backgroundColor: '#FBFBFD',
    overflow: 'hidden',
    borderRadius: Radius.lg,
  },
  canvasBorderEditing: { borderColor: Colors.primary, borderWidth: 1.5 },
  canvasInner: { flex: 1 },
  canvasEmpty: { ...StyleSheet.absoluteFillObject, justifyContent: 'center' },
  recenterBtn: {
    position: 'absolute',
    right: Spacing.sm,
    bottom: Spacing.sm,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.floatingLight,
  },

  toolbar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  btnPrimary: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    height: 40,
    justifyContent: 'center',
    borderRadius: Radius.full,
  },
  btnPrimaryText: { ...Typography.subheadline, color: Colors.onPrimary, fontWeight: '600' },
  btnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryTint,
    paddingHorizontal: Spacing.lg,
    height: 40,
    borderRadius: Radius.full,
  },
  btnSecondaryText: { ...Typography.subheadline, color: Colors.primary, fontWeight: '600' },
  btnGhost: { paddingHorizontal: Spacing.sm, height: 40, justifyContent: 'center' },
  btnGhostText: { ...Typography.subheadline, color: Colors.textSecondary, fontWeight: '600' },

  viewToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.fill,
    borderRadius: Radius.sm,
    padding: 2,
  },
  toggleBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.sm - 2,
  },
  toggleBtnActive: { backgroundColor: Colors.surface, ...Shadows.cardLight },

  listView: { paddingBottom: Spacing.xl, flexGrow: 1 },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.md,
    paddingRight: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
    ...Shadows.cardLight,
  },
  listStatusBar: { width: 4, alignSelf: 'stretch' },
  listTitle: { ...Typography.body, fontWeight: '600', color: Colors.textPrimary },
  listSubtitle: { ...Typography.caption, color: Colors.textTertiary, marginTop: 2 },
  listStatusText: { ...Typography.caption, fontWeight: '600' },
});
