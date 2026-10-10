import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Colors, Spacing, Typography } from '../constants/theme';
import { useAuth } from '../hooks/useAuth';
import SettingsSection from '../components/ui/SettingsSection';
import SettingsRow from '../components/ui/SettingsRow';

const ROLE_LABEL: Record<string, string> = {
  MANAGER: 'Manager',
  TECNICO: 'Técnico',
};

export default function PerfilScreen() {
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const confirmLogout = () => {
    Alert.alert('Cerrar sesión', '¿Querés cerrar la sesión en este dispositivo?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: async () => {
          setLoggingOut(true);
          await logout();
        },
      },
    ]);
  };

  const initial = user?.email?.charAt(0).toUpperCase() ?? '?';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <Text style={styles.email} numberOfLines={1}>{user?.email ?? '-'}</Text>
        <Text style={styles.role}>{ROLE_LABEL[user?.role ?? ''] ?? user?.role ?? '-'}</Text>
      </Animated.View>

      <SettingsSection title="Cuenta">
        <SettingsRow label="Email" value={user?.email ?? '-'} />
        <SettingsRow label="Rol" value={ROLE_LABEL[user?.role ?? ''] ?? '-'} isLast />
      </SettingsSection>

      <SettingsSection>
        <SettingsRow
          label={loggingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
          onPress={loggingOut ? undefined : confirmLogout}
          showChevron={false}
          destructive
          isLast
        />
      </SettingsSection>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: Colors.gray,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  email: {
    ...Typography.title3,
    color: Colors.textPrimary,
  },
  role: {
    ...Typography.subheadline,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
