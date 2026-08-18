// src/screens/ResetPasswordScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { authService } from '../services/authService';
import { Colors, Spacing, Typography } from '../constants/theme';
import TextField from '../components/ui/TextField';
import Button from '../components/ui/Button';
import PressableScale from '../components/ui/PressableScale';

type Props = NativeStackScreenProps<RootStackParamList, 'ResetPassword'>;

export default function ResetPasswordScreen({ navigation }: Props) {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const requestCode = async () => {
    if (!email.trim()) {
      Alert.alert('Atención', 'Ingresá tu email.');
      return;
    }
    setLoading(true);
    try {
      const message = await authService.forgotPassword(email.trim());
      Alert.alert('Email enviado', message);
      setStep('code');
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'No se pudo enviar el email');
    } finally {
      setLoading(false);
    }
  };

  const submitReset = async () => {
    if (!token.trim()) {
      Alert.alert('Atención', 'Ingresá el código recibido por email.');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Atención', 'La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    setLoading(true);
    try {
      const message = await authService.resetPassword(token.trim(), newPassword);
      Alert.alert('Listo', message);
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'No se pudo restablecer la contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recuperar contraseña</Text>

      {step === 'email' ? (
        <>
          <Text style={styles.subtitle}>
            Ingresá tu email y te enviaremos un código para restablecer la contraseña.
          </Text>
          <TextField
            label="Email"
            placeholder="taller@ejemplo.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
          />
          <Button title="Enviar código" onPress={requestCode} loading={loading} />
        </>
      ) : (
        <>
          <Text style={styles.subtitle}>
            Ingresá el código recibido y tu nueva contraseña.
          </Text>
          <TextField
            label="Código de reset"
            placeholder="Código recibido por email"
            autoCapitalize="none"
            autoCorrect={false}
            value={token}
            onChangeText={setToken}
          />
          <TextField
            label="Nueva contraseña"
            placeholder="Mínimo 8 caracteres"
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
          />
          <Button title="Restablecer contraseña" onPress={submitReset} loading={loading} />
        </>
      )}

      <PressableScale style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>Volver al inicio de sesión</Text>
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
    ...Typography.title2,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.subheadline,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  backButton: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  backText: {
    ...Typography.subheadline,
    color: Colors.accent,
    fontWeight: '600',
  },
});
