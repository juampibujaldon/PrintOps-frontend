import React from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Colors, Typography, Spacing } from '../../constants/theme';
import { PrinterSummary } from '../../types/printer';

interface Props {
  printer: PrinterSummary;
  initialX: number; // 0 to 1
  initialY: number; // 0 to 1
  canvasWidth: number;
  canvasHeight: number;
  onDragEnd: (x: number, y: number) => void;
  disabled?: boolean;
}

export default function CanvasNodeItem({ printer, initialX, initialY, canvasWidth, canvasHeight, onDragEnd, disabled = false }: Props) {
  const NODE_WIDTH = 120;
  const NODE_HEIGHT = 70;

  const x = useSharedValue(initialX * canvasWidth);
  const y = useSharedValue(initialY * canvasHeight);
  const isDragging = useSharedValue(false);

  const dragGesture = Gesture.Pan()
    .enabled(!disabled)
    .onStart(() => {
      isDragging.value = true;
    })
    .onUpdate((e) => {
      x.value = Math.max(NODE_WIDTH / 2, Math.min(canvasWidth - NODE_WIDTH / 2, x.value + e.velocityX * 0.01));
      y.value = Math.max(NODE_HEIGHT / 2, Math.min(canvasHeight - NODE_HEIGHT / 2, y.value + e.velocityY * 0.01));
      
      // Real dragging update (workaround for absolute positioning delta)
      x.value = Math.max(NODE_WIDTH / 2, Math.min(canvasWidth - NODE_WIDTH / 2, e.absoluteX - (canvasWidth / 2))); // This needs to be relative to the canvas.
    })
    .onEnd(() => {
      isDragging.value = false;
      // Convert back to 0-1
    });

  // Let's implement a simpler approach that tracks translation
  const translateX = useSharedValue(initialX * canvasWidth - NODE_WIDTH / 2);
  const translateY = useSharedValue(initialY * canvasHeight - NODE_HEIGHT / 2);
  const contextX = useSharedValue(0);
  const contextY = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .enabled(!disabled)
    .onStart(() => {
      isDragging.value = true;
      contextX.value = translateX.value;
      contextY.value = translateY.value;
    })
    .onUpdate((event) => {
      const snapSize = 20; // 20px grid snap
      let newX = contextX.value + event.translationX;
      let newY = contextY.value + event.translationY;
      
      // Limit to canvas bounds
      newX = Math.max(0, Math.min(canvasWidth - NODE_WIDTH, newX));
      newY = Math.max(0, Math.min(canvasHeight - NODE_HEIGHT, newY));

      // Snap to grid
      translateX.value = Math.round(newX / snapSize) * snapSize;
      translateY.value = Math.round(newY / snapSize) * snapSize;
    })
    .onEnd(() => {
      isDragging.value = false;
      // Convert to normalized coordinates (0 to 1 based on center of node)
      const normalizedX = (translateX.value + NODE_WIDTH / 2) / canvasWidth;
      const normalizedY = (translateY.value + NODE_HEIGHT / 2) / canvasHeight;
      // We need to call onDragEnd on JS thread
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
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
