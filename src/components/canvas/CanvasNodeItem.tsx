import React, { memo, useCallback, useLayoutEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming, SharedValue, runOnJS } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { AlertTriangle } from 'lucide-react-native';
import { Colors, Typography, Spacing, Radius, tint } from '../../constants/theme';
import { PRINTER_STATUS, daysUntilMaintenance } from '../../constants/printers';
import { PrinterResponse } from '../../services/printerService';

export const NODE_WIDTH = 120;
export const NODE_HEIGHT = 70;

interface Props {
  printer: PrinterResponse;
  initialX: number; // 0 to 1
  initialY: number; // 0 to 1
  canvasWidth: number;
  canvasHeight: number;
  // Callbacks estables y compartidos por todos los nodos: reciben el id/impresora para no crear closures por nodo.
  onDragEnd: (printerId: number, x: number, y: number) => void;
  onPress?: (printer: PrinterResponse) => void;
  disabled?: boolean;
  // Atenuado cuando hay un filtro activo en el resumen y la impresora no coincide.
  dimmed?: boolean;
  openOrders?: number;
  positions: SharedValue<Record<number, { x: number, y: number }>>;
}

function CanvasNodeItem({
  printer,
  initialX,
  initialY,
  canvasWidth,
  canvasHeight,
  onDragEnd,
  onPress,
  disabled = false,
  dimmed = false,
  openOrders = 0,
  positions,
}: Props) {
  const isDragging = useSharedValue(false);
  const printerId = printer.id;
  const handleDragEnd = useCallback(
    (x: number, y: number) => onDragEnd(printerId, x, y),
    [onDragEnd, printerId],
  );
  const handlePress = useCallback(() => onPress?.(printer), [onPress, printer]);

  // Initialize position in shared value if not set.
  // En un layout effect (no en el render) para no leer .value mientras React renderiza.
  useLayoutEffect(() => {
    if (!positions.value[printer.id]) {
      positions.value = {
        ...positions.value,
        [printer.id]: {
          x: initialX * canvasWidth - NODE_WIDTH / 2,
          y: initialY * canvasHeight - NODE_HEIGHT / 2
        }
      };
    }
  }, [positions, printer.id, initialX, initialY, canvasWidth, canvasHeight]);

  const contextX = useSharedValue(0);
  const contextY = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .enabled(!disabled)
    .onStart(() => {
      isDragging.value = true;
      const currentPos = positions.value[printer.id];
      contextX.value = currentPos ? currentPos.x : 0;
      contextY.value = currentPos ? currentPos.y : 0;
    })
    .onUpdate((event) => {
      const snapSize = 20; // 20px grid snap
      let newX = contextX.value + event.translationX;
      let newY = contextY.value + event.translationY;

      // Limit to canvas bounds
      newX = Math.max(0, Math.min(canvasWidth - NODE_WIDTH, newX));
      newY = Math.max(0, Math.min(canvasHeight - NODE_HEIGHT, newY));

      const snappedX = Math.round(newX / snapSize) * snapSize;
      const snappedY = Math.round(newY / snapSize) * snapSize;

      positions.value = {
        ...positions.value,
        [printer.id]: { x: snappedX, y: snappedY }
      };
    })
    .onEnd(() => {
      isDragging.value = false;
      const currentPos = positions.value[printer.id];
      if (currentPos) {
        const normalizedX = (currentPos.x + NODE_WIDTH / 2) / canvasWidth;
        const normalizedY = (currentPos.y + NODE_HEIGHT / 2) / canvasHeight;
        runOnJS(handleDragEnd)(normalizedX, normalizedY);
      }
    });

  // Tocar abre la ficha rápida; solo fuera del modo edición (ahí se arrastra).
  const tapGesture = Gesture.Tap()
    .enabled(disabled && !!onPress)
    .onEnd((_e, success) => {
      if (success && onPress) runOnJS(handlePress)();
    });

  const gesture = Gesture.Exclusive(panGesture, tapGesture);

  const animatedStyle = useAnimatedStyle(() => {
    const currentPos = positions.value[printer.id] || { x: 0, y: 0 };
    return {
      transform: [
        { translateX: currentPos.x },
        { translateY: currentPos.y },
        { scale: withSpring(isDragging.value ? 1.05 : 1) }
      ],
      zIndex: isDragging.value ? 100 : 1,
      shadowOpacity: withSpring(isDragging.value ? 0.25 : 0.08),
      opacity: withTiming(dimmed ? 0.3 : 1, { duration: 200 }),
    };
  });

  const status = PRINTER_STATUS[printer.status] ?? { label: 'Sin estado', color: Colors.statusUnknown };
  const days = daysUntilMaintenance(printer.nextMaintenanceDate);
  const alertColor = days == null ? null : days < 0 ? Colors.statusFuera : days <= 7 ? Colors.statusMantenim : null;

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[styles.node, { borderColor: tint(status.color, 0.55) }, animatedStyle]}
        accessibilityRole="button"
        accessibilityLabel={`${printer.name || printer.model}, ${status.label}`}
      >
        <View style={[styles.statusBar, { backgroundColor: status.color }]} />
        <View style={styles.body}>
          <Text style={styles.name} numberOfLines={1}>{printer.name || printer.model}</Text>
          <Text style={styles.model} numberOfLines={1}>{printer.brand} {printer.model}</Text>
          <View style={styles.statusRow}>
            <View style={[styles.dot, { backgroundColor: status.color }]} />
            <Text style={[styles.statusText, { color: status.color }]} numberOfLines={1}>{status.label}</Text>
          </View>
        </View>
        {alertColor && (
          <View style={[styles.cornerBadge, { backgroundColor: alertColor }]}>
            <AlertTriangle color="#FFFFFF" size={11} strokeWidth={2.5} />
          </View>
        )}
        {!alertColor && openOrders > 0 && (
          <View style={[styles.cornerBadge, { backgroundColor: Colors.primary }]}>
            <Text style={styles.cornerText}>{openOrders}</Text>
          </View>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

export default memo(CanvasNodeItem);

const styles = StyleSheet.create({
  node: {
    position: 'absolute',
    width: NODE_WIDTH,
    height: NODE_HEIGHT,
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderRadius: Radius.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  statusBar: { width: 4, borderTopLeftRadius: Radius.md, borderBottomLeftRadius: Radius.md },
  body: { flex: 1, paddingHorizontal: Spacing.sm, justifyContent: 'center' },
  name: { ...Typography.footnote, fontWeight: '600', color: Colors.textPrimary },
  model: { ...Typography.caption2, color: Colors.textTertiary, marginTop: 1 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { ...Typography.caption2, fontWeight: '600', flexShrink: 1 },
  cornerBadge: {
    position: 'absolute',
    top: -7,
    right: -7,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 4,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cornerText: { ...Typography.caption2, fontWeight: '700', color: '#FFFFFF' },
});
