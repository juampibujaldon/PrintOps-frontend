// src/screens/HomeScreen.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { Colors } from '../constants/theme';

export default function HomeScreen() {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.welcome}>Bienvenido, {user?.email}</Text>
      <Text style={styles.role}>Rol: {user?.role}</Text>
      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  welcome: { fontSize: 22, fontWeight: 'bold', marginBottom: 8, color: Colors.textPrimary },
  role: { fontSize: 16, color: Colors.textSecondary, marginBottom: 32 },
  logoutButton: { backgroundColor: Colors.error, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  logoutText: { color: Colors.background, fontWeight: '600' },
});
