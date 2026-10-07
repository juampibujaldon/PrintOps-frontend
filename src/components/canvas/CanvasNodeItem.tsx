import React from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, SharedValue, runOnJS } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Colors, Typography, Spacing } from '../../constants/theme';
import { PrinterResponse } from '../../services/printerService';

interface Props {
  printer: PrinterResponse;
  initialX: number; // 0 to 1
  initialY: number; // 0 to 1
  canvasWidth: number;
  canvasHeight: number;
  onDragEnd: (x: number, y: number) => void;
  disabled?: boolean;
  positions: SharedValue<Record<number, { x: number, y: number }>>;
}

export default function CanvasNodeItem({ printer, initialX, initialY, canvasWidth, canvasHeight, onDragEnd, disabled = false, positions }: Props) {
  const NODE_WIDTH = 120;
  const NODE_HEIGHT = 70;

  const isDragging = useSharedValue(false);

  // Initialize position in shared value if not set
  if (!positions.value[printer.id]) {
    positions.value = {
      ...positions.value,
      [printer.id]: {
        x: initialX * canvasWidth - NODE_WIDTH / 2,
        y: initialY * canvasHeight - NODE_HEIGHT / 2
      }
    };
  }



  // Let's implement a simpler approach that tracks translation
  const translateX = useSharedValue(initialX * canvasWidth - NODE_WIDTH / 2);
  const translateY = useSharedValue(initialY * canvasHeight - NODE_HEIGHT / 2);
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
        runOnJS(onDragEnd)(normalizedX, normalizedY);
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    const currentPos = positions.value[printer.id] || { x: 0, y: 0 };
    return {
      transform: [
        { translateX: currentPos.x },
        { translateY: currentPos.y },
        { scale: withSpring(isDragging.value ? 1.05 : 1) }
      ],
      zIndex: isDragging.value ? 100 : 1,
      shadowOpacity: withSpring(isDragging.value ? 0.3 : 0.1),
    };
  });

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'OPERATIVE': return Colors.successText;
      case 'MAINTENANCE': return Colors.warningText;
      case 'OUT_OF_SERVICE': return Colors.errorText;
      default: return Colors.textTertiary;
    }
  };

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.node, animatedStyle]}>
        <Text style={styles.nodeText} numberOfLines={1}>{printer.brand} {printer.model}</Text>
        <Text style={[styles.statusText, { color: getStatusColor(printer.status) }]}>{printer.status}</Text>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  node: {
    position: 'absolute',
    width: 120,
    height: 70,
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: Spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  nodeText: { ...Typography.caption, fontWeight: '600', color: Colors.textPrimary, textAlign: 'center' },
  statusText: { ...Typography.footnote, fontWeight: '500', marginTop: 4 },
});
