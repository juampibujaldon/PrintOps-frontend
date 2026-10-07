import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, LayoutChangeEvent, TouchableOpacity, Alert } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Colors, Typography, Spacing, Radius } from '../constants/theme';
import { canvasService, CanvasLayout } from '../services/canvasService';
import { printerService, PrinterResponse } from '../services/printerService';
import ErrorState from '../components/ui/ErrorState';
import ScreenHeader from '../components/ui/ScreenHeader';
import CanvasNodeItem from '../components/canvas/CanvasNodeItem';
import CanvasEdgeItem from '../components/canvas/CanvasEdgeItem';
import Svg from 'react-native-svg';
import { useAuth } from '../hooks/useAuth';

export default function WorkshopCanvasScreen() {
  const { user } = useAuth();
  const isManager = user?.role === 'MANAGER';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [editMode, setEditMode] = useState(false);
  const [viewMode, setViewMode] = useState<'canvas' | 'list'>('canvas');
  
  const [printers, setPrinters] = useState<PrinterResponse[]>([]);
  const [layout, setLayout] = useState<CanvasLayout>({ nodes: [], edges: [] });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [fetchedPrinters, fetchedLayout] = await Promise.all([
        printerService.getAllPrinters(),
        canvasService.getCanvasLayout(),
      ]);
      setPrinters(fetchedPrinters);
      setLayout(fetchedLayout);
    } catch (e: any) {
      setError(e.message || 'Error al cargar el taller');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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

  const handleDragEnd = useCallback((printerId: number, normalizedX: number, normalizedY: number) => {
    if (!editMode) return;
    setLayout(prev => ({
      ...prev,
      nodes: prev.nodes.map(n => n.printerId === printerId ? { ...n, x: normalizedX, y: normalizedY } : n)
    }));
  }, [editMode]);

  const toggleEditMode = () => {
    if (!isManager) return;
    setEditMode(!editMode);
  };

  const saveLayout = async () => {
    try {
      setSaving(true);
      const saved = await canvasService.updateCanvasLayout(layout);
      setLayout(saved);
      setEditMode(false);
    } catch (e: any) {
      Alert.alert('Error', 'No se pudo guardar el layout');
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

    Alert.alert(
      'Agregar Impresora',
      'Elegí la impresora a ubicar en el plano',
      unplaced.map(p => ({
        text: `${p.brand} ${p.model}`,
        onPress: () => {
          setLayout(prev => ({
            ...prev,
            nodes: [...prev.nodes, { printerId: p.id, x: 0.5, y: 0.5 }]
          }));
        }
      })).concat([{ text: 'Cancelar', style: 'cancel', onPress: () => {} }])
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Taller" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Taller" />
        <ErrorState error={error} onRetry={load} />
      </View>
    );
  }


  return (
    <View style={styles.container}>
      <ScreenHeader title="Taller" />
      <View style={styles.canvasArea} onLayout={(e: LayoutChangeEvent) => {
        setCanvasSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height });
      }}>
        <Text style={styles.debugText}>
          {printers.length} impresoras encontradas. {layout.nodes.length} ubicadas.
        </Text>
        
        <View style={styles.viewToggle}>
          <TouchableOpacity 
            style={[styles.toggleBtn, viewMode === 'canvas' && styles.toggleBtnActive]}
            onPress={() => setViewMode('canvas')}
          >
            <Text style={[styles.toggleBtnText, viewMode === 'canvas' && styles.toggleBtnTextActive]}>Lienzo</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
            onPress={() => setViewMode('list')}
          >
            <Text style={[styles.toggleBtnText, viewMode === 'list' && styles.toggleBtnTextActive]}>Lista</Text>
          </TouchableOpacity>
        </View>

        {viewMode === 'canvas' ? (
          <View style={styles.canvasBorder}>
            <GestureDetector gesture={composedGesture}>
              <Animated.View style={[styles.canvasInner, canvasAnimatedStyle]}>
                {canvasSize.width > 0 && (
                  <>
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
                    {layout.nodes.map(node => {
                      const p = printers.find(x => x.id === node.printerId);
                      if (!p) return null;
                      return (
                        <CanvasNodeItem
                          key={node.printerId}
                          printer={p}
                          initialX={node.x}
                          initialY={node.y}
                          canvasWidth={canvasSize.width}
                          canvasHeight={canvasSize.height}
                          onDragEnd={(x, y) => handleDragEnd(p.id, x, y)}
                          positions={positions}
                          disabled={!editMode}
                        />
                      );
                    })}
                  </>
                )}
              </Animated.View>
            </GestureDetector>
          </View>
        ) : (
          <View style={styles.listView}>
            {printers.map(p => (
              <View 
                key={p.id} 
                style={styles.listItem}
                accessibilityRole="text"
                accessibilityLabel={`Impresora ${p.brand} ${p.model}, estado: ${p.status}`}
              >
                <Text style={styles.listTitle}>{p.brand} {p.model}</Text>
                <Text style={styles.listSubtitle}>{p.serialNumber}</Text>
                <View style={styles.listStatusBadge}>
                  <Text style={styles.listStatusText}>{p.status}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
        
        {isManager && viewMode === 'canvas' && (
          <View style={styles.toolbar}>
            {editMode ? (
              <>
                <TouchableOpacity style={styles.btnSecondary} onPress={handleAddPrinter}>
                  <Text style={styles.btnSecondaryText}>+ Agregar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnPrimary} onPress={saveLayout} disabled={saving}>
                  <Text style={styles.btnPrimaryText}>{saving ? 'Guardando...' : 'Guardar Layout'}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={styles.btnSecondary} onPress={toggleEditMode}>
                <Text style={styles.btnSecondaryText}>Editar Plano</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  canvasArea: { flex: 1, padding: Spacing.md },
  debugText: { ...Typography.caption, color: Colors.textTertiary, marginBottom: Spacing.md },
  canvasBorder: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 8,
  },
  canvasInner: {
    flex: 1,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  btnPrimary: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
  },
  btnPrimaryText: { ...Typography.body, color: Colors.onPrimary, fontWeight: '600' },
  btnSecondary: {
    backgroundColor: Colors.surface,
    borderColor: Colors.primary,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
  },
  btnSecondaryText: { ...Typography.body, color: Colors.primary, fontWeight: '600' },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    alignSelf: 'center',
    marginBottom: Spacing.md,
    padding: 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  toggleBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
  },
  toggleBtnActive: { backgroundColor: Colors.primary },
  toggleBtnText: { ...Typography.footnote, color: Colors.textSecondary },
  toggleBtnTextActive: { color: Colors.onPrimary, fontWeight: '600' },
  listView: { flex: 1 },
  listItem: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  listTitle: { ...Typography.body, fontWeight: '600', color: Colors.textPrimary },
  listSubtitle: { ...Typography.caption, color: Colors.textTertiary, marginTop: 2 },
  listStatusBadge: {
    position: 'absolute',
    right: Spacing.md,
    top: Spacing.md,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  listStatusText: { ...Typography.caption, fontWeight: '500', color: Colors.textSecondary },
});
