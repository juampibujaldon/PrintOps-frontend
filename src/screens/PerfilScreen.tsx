// src/screens/PerfilScreen.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography } from '../constants/theme';
import { useAuth } from '../hooks/useAuth';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

export default function PerfilScreen() {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mi Perfil</Text>

      <Card style={styles.infoCard}>
        <Row label="Email" value={user?.email ?? '-'} />
        <Row label="Rol" value={user?.role ?? '-'} />
      </Card>

      <Button title="Cerrar sesión" variant="danger" onPress={logout} style={styles.logoutButton} />
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.lg,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...Typography.title2,
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  infoCard: {
    width: '100%',
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  row: {},
  label: {
    ...Typography.footnote,
    color: Colors.textTertiary,
    fontWeight: '600',
    marginBottom: 2,
  },
  value: {
    ...Typography.title3,
    color: Colors.textPrimary,
  },
  logoutButton: {
    width: '100%',
  },
});
