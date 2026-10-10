import { useCallback } from 'react';
import { NativeSyntheticEvent, TextInputFocusEventData } from 'react-native';
import { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Colors, Motion } from '../../constants/theme';

// Borde de foco animado para inputs: transparente en reposo, acento al enfocar,
// rojo si hay error.
export function useFocusRing(hasError: boolean, onFocus?: (e: NativeSyntheticEvent<TextInputFocusEventData>) => void, onBlur?: (e: NativeSyntheticEvent<TextInputFocusEventData>) => void) {
  const focused = useSharedValue(0);

  const ringStyle = useAnimatedStyle(() => ({
    borderColor: hasError
      ? Colors.red
      : interpolateColor(focused.value, [0, 1], ['rgba(0,0,0,0)', Colors.primary]),
    backgroundColor: interpolateColor(focused.value, [0, 1], [Colors.fill, Colors.surface]),
  }));

  const handleFocus = useCallback((e: NativeSyntheticEvent<TextInputFocusEventData>) => {
    focused.value = withTiming(1, { duration: Motion.durations.fast, easing: Motion.easings.standard });
    onFocus?.(e);
  }, [focused, onFocus]);

  const handleBlur = useCallback((e: NativeSyntheticEvent<TextInputFocusEventData>) => {
    focused.value = withTiming(0, { duration: Motion.durations.base, easing: Motion.easings.standard });
    onBlur?.(e);
  }, [focused, onBlur]);

  return { ringStyle, handleFocus, handleBlur };
}
