// src/components/auth/GoogleDivider.tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Spacing, Typography } from '../../constants/theme';
import { isGoogleSignInConfigured } from '../../services/googleAuth';

// Separador "o" que solo se muestra junto al botón de Google.
export default function GoogleDivider() {
  if (!isGoogleSignInConfigured()) {return null;}
  return (
    <View style={styles.row}>
      <View style={styles.line} />
      <Text style={styles.text}>o</Text>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginVertical: Spacing.lg },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: Colors.textTertiary },
  text: { ...Typography.footnote, color: Colors.textSecondary, marginHorizontal: Spacing.md },
});
