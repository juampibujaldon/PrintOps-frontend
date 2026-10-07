import React from 'react';
import Animated, { useAnimatedProps, SharedValue } from 'react-native-reanimated';
import { Path } from 'react-native-svg';
import { Colors } from '../../constants/theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface Props {
  fromId: number;
  toId: number;
  positions: SharedValue<Record<number, { x: number, y: number }>>;
}

export default function CanvasEdgeItem({ fromId, toId, positions }: Props) {
  const animatedProps = useAnimatedProps(() => {
    const fromPos = positions.value[fromId];
    const toPos = positions.value[toId];

    if (!fromPos || !toPos) {
      return { d: '' };
    }

    // Curva bezier con caída leve
    // Start at center bottom of 'from' node, end at center top of 'to' node
    const NODE_WIDTH = 120;
    const NODE_HEIGHT = 70;
    
    const x1 = fromPos.x + NODE_WIDTH / 2;
    const y1 = fromPos.y + NODE_HEIGHT / 2;
    
    const x2 = toPos.x + NODE_WIDTH / 2;
    const y2 = toPos.y + NODE_HEIGHT / 2;

    const controlPointYOffset = Math.abs(y2 - y1) * 0.5 + 40;
    const cp1x = x1;
    const cp1y = y1 + controlPointYOffset;
    const cp2x = x2;
    const cp2y = y2 - controlPointYOffset;

    return {
      d: `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`
    };
  });

  return (
    <AnimatedPath
      animatedProps={animatedProps}
      fill="none"
      stroke="#556B2F" // Verde oliva
      strokeWidth={3}
    />
  );
}
