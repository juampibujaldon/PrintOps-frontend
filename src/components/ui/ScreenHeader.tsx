import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { Colors, Spacing, Typography } from '../../constants/theme';
import { useNavigation } from '@react-navigation/native';

export default function ScreenHeader({ title, showBack = false, rightContent }: { title: string, showBack?: boolean, rightContent?: React.ReactNode }) {
  const nav = useNavigation();
  return (
    <View style={styles.container}>
      {showBack && (
        <TouchableOpacity style={styles.backBtn} onPress={() => nav.goBack()} accessibilityRole="button" accessibilityLabel="Volver">
          <ChevronLeft color={Colors.textPrimary} size={24} />
        </TouchableOpacity>
      )}
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      {rightContent && <View style={styles.right}>{rightContent}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, backgroundColor: Colors.background },
  backBtn: { padding: Spacing.xs, marginRight: Spacing.sm, marginLeft: -Spacing.xs },
  title: { ...Typography.title, color: Colors.textPrimary, flex: 1 },
  right: { marginLeft: Spacing.sm },
});
