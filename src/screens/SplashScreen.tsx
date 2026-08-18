// src/screens/SplashScreen.tsx
import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Colors } from '../constants/theme';

export default function SplashScreen() {
  // El enrutador (AppNavigator) desmonta esta pantalla automáticamente cuando isLoading pasa a false.
  return (
    <View style={styles.container}>
      <Text style={styles.title}>PrintOps</Text>
      <Text style={styles.subtitle}>Gestión de impresoras 3D</Text>
      <ActivityIndicator size="large" color={Colors.accent} style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 40,
  },
  spinner: {
    marginTop: 20,
  },
});
