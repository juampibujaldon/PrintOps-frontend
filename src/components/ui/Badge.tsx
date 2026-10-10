import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { Radius, Spacing, Typography, tint } from '../../constants/theme';

// Dos formas de uso: colores explícitos (bgColor/textColor) o un color sólido
// (color) del que se deriva un fondo suave. `pulse` agrega un punto animado
// para estados "en curso".
type BadgeProps =
  | { label: string; bgColor: string; textColor: string; color?: never; pulse?: boolean }
  | { label: string; color: string; bgColor?: never; textColor?: never; pulse?: boolean };

export default function Badge(props: BadgeProps) {
  const { label, pulse } = props;
  const fg = props.color ?? props.textColor!;
  const bg = props.color ? tint(props.color) : props.bgColor!;

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      {pulse ? <PulseDot color={fg} /> : null}
      <Text style={[styles.text, { color: fg }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

function PulseDot({ color }: { color: string }) {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.3, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[styles.dot, { backgroundColor: color }, style]} />;
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: {
    ...Typography.caption,
    fontWeight: '600',
  },
});
