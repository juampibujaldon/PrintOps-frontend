import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Colors, Typography, Spacing } from '../constants/theme';
import { canvasService, CanvasLayout } from '../services/canvasService';
import { printerService } from '../services/printerService';
import { PrinterSummary } from '../types/printer';
import ErrorState from '../components/ui/ErrorState';
import ScreenHeader from '../components/ui/ScreenHeader';
import CanvasNodeItem from '../components/canvas/CanvasNodeItem';

export default function WorkshopCanvasScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  
  const [printers, setPrinters] = useState<PrinterSummary[]>([]);
  const [layout, setLayout] = useState<CanvasLayout>({ nodes: [], edges: [] });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [fetchedPrinters, fetchedLayout] = await Promise.all([
        printerService.getAll(),
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

  // Pan & Zoom for the whole canvas
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

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
    // We will save later. For now, it's optimistic UI via Reanimated state.
    console.log('Dragged', printerId, normalizedX, normalizedY);
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <ScreenHeader title="Taller" />
      <View style={styles.canvasArea} onLayout={(e: LayoutChangeEvent) => {
        setCanvasSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height });
      }}>
        <Text style={styles.debugText}>
          {printers.length} impresoras encontradas. {layout.nodes.length} ubicadas.
        </Text>
        
        <View style={styles.canvasBorder}>
          <GestureDetector gesture={composedGesture}>
            <Animated.View style={[styles.canvasInner, canvasAnimatedStyle]}>
              {canvasSize.width > 0 && layout.nodes.map(node => {
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
                  />
                );
              })}
            </Animated.View>
          </GestureDetector>
        </View>
      </View>
    </GestureHandlerRootView>
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

});
