import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { authService } from '../services/authService';
import TextField from '../components/ui/TextField';
import Button from '../components/ui/Button';
import PressableScale from '../components/ui/PressableScale';
import { Colors, Spacing, Typography } from '../constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'VerifyEmail'>;

export default function VerifyEmailScreen({ navigation, route }: Props) {
  const { email } = route.params;
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (!code || code.length !== 6) {
      Alert.alert('Error', 'Ingresá el código de 6 dígitos.');
      return;
    }

    setLoading(true);
    try {
      const message = await authService.verifyEmail(code);
      Alert.alert('¡Éxito!', message, [
        { text: 'Ir a Login', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (error: any) {
      const message =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        'No se pudo verificar el código.';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      const message = await authService.resendVerification(email);
      Alert.alert('Email reenviado', message);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        'No se pudo reenviar el email.';
      Alert.alert('Error', message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verificar Email</Text>
      <Text style={styles.subtitle}>
        Ingresá el código de 6 dígitos que enviamos a {email}
      </Text>

      <TextField
        label="Código de verificación"
        placeholder="123456"
        keyboardType="number-pad"
        maxLength={6}
        value={code}
        onChangeText={setCode}
        style={{ textAlign: 'center', fontSize: 24, letterSpacing: 8 }}
      />

      <Button title="Verificar" onPress={handleVerify} loading={loading} />

      <PressableScale style={styles.linkButton} onPress={handleResend}>
        <Text style={styles.linkText}>¿No recibiste el código? Reenviar</Text>
      </PressableScale>

      <PressableScale style={styles.linkButton} onPress={() => navigation.navigate('Login')}>
        <Text style={styles.linkText}>Volver al Login</Text>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.background,
  },
  title: {
    ...Typography.title1,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.subheadline,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  linkButton: {
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  linkText: {
    ...Typography.subheadline,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
});
