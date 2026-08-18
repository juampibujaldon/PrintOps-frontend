// src/components/ui/PressableScale.tsx
import React from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SPRING = { damping: 15, stiffness: 300 };

type Props = PressableProps & {
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
};

export default function PressableScale({
  style,
  scaleTo = 0.97,
  onPressIn,
  onPressOut,
  children,
  ...rest
}: Props) {
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - (1 - scaleTo) * pressed.value }],
    opacity: 1 - 0.1 * pressed.value,
  }));

  return (
    <AnimatedPressable
      {...rest}
      onPressIn={e => {
        pressed.value = withSpring(1, SPRING);
        onPressIn?.(e);
      }}
      onPressOut={e => {
        pressed.value = withSpring(0, SPRING);
        onPressOut?.(e);
      }}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}
