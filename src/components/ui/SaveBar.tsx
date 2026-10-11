import React from 'react';
import { Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Check } from 'lucide-react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography, Radius, Motion } from '../../constants/theme';
import PressableScale from './PressableScale';

type Status = 'idle' | 'saving' | 'saved';

interface Props {
  hasChanges: boolean;
  status: Status;
  onSave: () => void;
}

export default function SaveBar({ hasChanges, status, onSave }: Props) {
  const insets = useSafeAreaInsets();
  if (!hasChanges && status === 'idle') return null;

  return (
    <Animated.View
      entering={SlideInDown.duration(Motion.durations.base)}
      exiting={SlideOutDown.duration(Motion.durations.fast)}
      style={[styles.bar, { paddingBottom: Math.max(insets.bottom, Spacing.lg) }]}
    >
      {status === 'saved' ? (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={styles.savedRow}>
          <Check color={Colors.successText} size={18} strokeWidth={2.25} />
          <Text style={styles.savedText}>Guardado</Text>
        </Animated.View>
      ) : (
        <PressableScale
          style={[styles.btn, !hasChanges && styles.btnDisabled]}
          onPress={onSave}
          disabled={!hasChanges || status === 'saving'}
          accessibilityRole="button"
        >
          {status === 'saving' ? (
            <ActivityIndicator color={Colors.onPrimary} />
          ) : (
            <Text style={styles.btnText}>Guardar cambios</Text>
          )}
        </PressableScale>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.md,
    backgroundColor: 'rgba(249, 249, 249, 0.96)',
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.separator,
  },
  btn: {
    height: 50, borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { ...Typography.headline, color: Colors.onPrimary },
  savedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, height: 50 },
  savedText: { ...Typography.headline, color: Colors.successText },
});
