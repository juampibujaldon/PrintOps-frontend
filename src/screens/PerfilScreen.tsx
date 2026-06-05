// src/screens/PerfilScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../constants/theme';
import { useAuth } from '../hooks/useAuth';

export default function PerfilScreen() {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mi Perfil</Text>
      
      <View style={styles.infoCard}>
        <Text style={styles.label}>Email:</Text>
        <Text style={styles.value}>{user?.email}</Text>
        
        <Text style={styles.label}>Rol:</Text>
        <Text style={styles.value}>{user?.role}</Text>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: Colors.textPrimary, marginBottom: 20 },
  infoCard: { width: '100%', backgroundColor: Colors.inputBackground, padding: 20, borderRadius: 12, marginBottom: 30 },
  label: { fontSize: 14, color: Colors.textSecondary, fontWeight: '600', marginTop: 10 },
  value: { fontSize: 18, color: Colors.textPrimary, marginBottom: 5 },
  logoutButton: { backgroundColor: Colors.error, paddingHorizontal: 30, paddingVertical: 14, borderRadius: 8, width: '100%', alignItems: 'center' },
  logoutText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});
