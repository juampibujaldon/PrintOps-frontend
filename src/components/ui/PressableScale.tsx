import React from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { Motion } from '../../constants/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PressableScaleProps extends PressableProps {
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  children: React.ReactNode;
}

// Feedback táctil sutil: leve reducción de escala con spring amortiguado y un
// atenuado de opacidad, como los controles de iOS.
export default function PressableScale({ style, scaleTo = 0.97, children, onPressIn, onPressOut, disabled, ...props }: PressableScaleProps) {
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - (1 - scaleTo) * pressed.value }],
    opacity: 1 - 0.15 * pressed.value,
  }));

  return (
    <AnimatedPressable
      {...props}
      disabled={disabled}
      style={[style, animatedStyle]}
      onPressIn={(e) => {
        pressed.value = withTiming(1, { duration: Motion.durations.fast, easing: Motion.easings.standard });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        pressed.value = withSpring(0, Motion.springs.damped);
        onPressOut?.(e);
      }}
    >
      {children}
    </AnimatedPressable>
  );
}
