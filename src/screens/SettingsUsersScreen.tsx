import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography } from '../constants/theme';

export default function SettingsUsersScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gestión de Usuarios</Text>
      <Text style={{color: Colors.textSecondary}}>Próximamente: Invitar usuarios, cambiar roles y deshabilitar (sólo Admin).</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.lg, backgroundColor: Colors.background },
  title: { ...Typography.title2, color: Colors.textPrimary, marginBottom: Spacing.md },
});
