import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { Colors, Spacing, Typography } from '../../constants/theme';
import { useNavigation } from '@react-navigation/native';

// Encabezado con título grande (Large Title de iOS) y botón de volver opcional.
export default function ScreenHeader({ title, showBack = false, rightContent }: { title: string, showBack?: boolean, rightContent?: React.ReactNode }) {
  const nav = useNavigation();
  return (
    <View style={styles.container}>
      {showBack ? (
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          onPress={() => nav.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          hitSlop={8}
        >
          <ChevronLeft color={Colors.primary} size={28} strokeWidth={2} />
        </Pressable>
      ) : null}
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      {rightContent ? <View style={styles.right}>{rightContent}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.md, backgroundColor: Colors.background },
  backBtn: { marginRight: Spacing.xs, marginLeft: -Spacing.sm },
  pressed: { opacity: 0.4 },
  title: { ...Typography.display, color: Colors.textPrimary, flex: 1 },
  right: { marginLeft: Spacing.sm },
});
