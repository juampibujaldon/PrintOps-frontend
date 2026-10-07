import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Check } from 'lucide-react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Colors, Spacing, Typography, Shadows } from '../../constants/theme';

type Status = 'idle' | 'saving' | 'saved';

interface Props {
  hasChanges: boolean;
  status: Status;
  onSave: () => void;
}

export default function SaveBar({ hasChanges, status, onSave }: Props) {
  if (!hasChanges && status === 'idle') return null;

  return (
    <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={styles.bar}>
      {status === 'saved' ? (
        <View style={styles.savedRow}>
          <Check color={Colors.successText} size={20} />
          <Text style={styles.savedText}>Guardado</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.btn, !hasChanges && styles.btnDisabled]}
          onPress={onSave}
          disabled={!hasChanges || status === 'saving'}
          activeOpacity={0.8}
        >
          {status === 'saving' ? (
            <ActivityIndicator color={Colors.onPrimary} />
          ) : (
            <Text style={styles.btnText}>Guardar cambios</Text>
          )}
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: Spacing.lg, paddingBottom: Spacing.xxl,
    backgroundColor: Colors.surface,
    borderTopWidth: 1, borderTopColor: Colors.border,
    ...Shadows.floatingLight,
  },
  btn: {
    height: 48, borderRadius: 999,
    backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  btnDisabled: { backgroundColor: Colors.primaryDisabled },
  btnText: { ...Typography.body, fontWeight: '600', color: Colors.onPrimary },
  savedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, height: 48 },
  savedText: { ...Typography.body, fontWeight: '600', color: Colors.successText },
});
