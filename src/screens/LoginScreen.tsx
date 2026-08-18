// src/screens/LoginScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Alert, Switch, Image,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import ReactNativeBiometrics from 'react-native-biometrics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/authService';
import { LoginFormData } from '../types/auth';
import { Colors, Spacing, Typography } from '../constants/theme';
import TextField from '../components/ui/TextField';
import Button from '../components/ui/Button';
import PressableScale from '../components/ui/PressableScale';

const schema = yup.object({
  email: yup
    .string()
    .email('Email inválido')
    .required('El email es requerido'),
  password: yup
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .required('La contraseña es requerida'),
  rememberMe: yup.boolean().default(false),
});

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Login'>;
};

export default function LoginScreen({ navigation }: Props) {
  const { login, restore } = useAuth();
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: yupResolver(schema),
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  React.useEffect(() => {
    checkBiometrics();
  }, []);

  const checkBiometrics = async () => {
    try {
      const rnBiometrics = new ReactNativeBiometrics();
      const { available } = await rnBiometrics.isSensorAvailable();
      setBiometricAvailable(available);
      if (available) {
        const enabled = await AsyncStorage.getItem('BIOMETRICS_ENABLED');
        setBiometricEnabled(enabled === 'true');
      }
    } catch {
      setBiometricAvailable(false);
      setBiometricEnabled(false);
    }
  };

  const promptFaceIdAsync = () => new Promise<boolean>((resolve) => {
    Alert.alert(
      'Activar Face ID',
      '¿Querés usar Face ID para futuros inicios de sesión?',
      [
        {
          text: 'Ahora no',
          style: 'cancel',
          onPress: async () => {
            await AsyncStorage.setItem('BIOMETRICS_DECLINED', 'true');
            resolve(false);
          },
        },
        {
          text: 'Activar',
          onPress: async () => {
            const ok = await authService.enableBiometrics();
            if (ok) setBiometricEnabled(true);
            resolve(ok);
          },
        },
      ],
      { cancelable: false }
    );
  });

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    try {
      const declined = await AsyncStorage.getItem('BIOMETRICS_DECLINED');
      if (biometricAvailable && !biometricEnabled && declined !== 'true') {
        await promptFaceIdAsync();
      }

      await login(data.email, data.password, data.rememberMe);
    } catch (error: any) {
      const status = error?.response?.status;
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        'Error al iniciar sesión';

      if (status === 403 && /verific/i.test(message)) {
        Alert.alert('Email no verificado', message, [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Reenviar email', onPress: () => handleResendVerification(data.email) },
        ]);
      } else {
        Alert.alert('Error', message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async (email: string) => {
    try {
      const message = await authService.resendVerification(email);
      Alert.alert('Email reenviado', message);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        'No se pudo reenviar el email';
      Alert.alert('Error', message);
    }
  };

  const onBiometricLogin = async () => {
    try {
      const rnBiometrics = new ReactNativeBiometrics();
      const { success } = await rnBiometrics.simplePrompt({
        promptMessage: 'Confirmar identidad para ingresar',
      });

      if (success) {
        const restored = await restore(true);
        if (!restored) {
          Alert.alert('Sesión expirada', 'Debes iniciar sesión con contraseña al menos una vez.');
        }
      } else {
        Alert.alert('Autenticación fallida', 'No se pudo verificar la identidad');
      }
    } catch (error: any) {
      Alert.alert('No se pudo iniciar', error?.message || 'Tu sesión expiró. Iniciá sesión con contraseña nuevamente.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Iniciar sesión</Text>
      <Text style={styles.subtitle}>Ingresá a tu taller para gestionar tus impresoras.</Text>

      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, value } }) => (
          <TextField
            label="Email"
            placeholder="taller@ejemplo.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={value}
            onChangeText={onChange}
            error={errors.email?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, value } }) => (
          <TextField
            label="Contraseña"
            placeholder="Mínimo 8 caracteres"
            secureTextEntry
            value={value}
            onChangeText={onChange}
            error={errors.password?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="rememberMe"
        render={({ field: { onChange, value } }) => (
          <View style={styles.rememberContainer}>
            <Text style={styles.rememberText}>Recordar sesión (30 días)</Text>
            <Switch value={value} onValueChange={onChange} />
          </View>
        )}
      />

      <Button title="Ingresar" onPress={handleSubmit(onSubmit)} loading={loading} />

      {biometricEnabled && (
        <PressableScale style={styles.biometricButton} onPress={onBiometricLogin}>
          <Image
            source={{ uri: 'https://img.icons8.com/ios/100/000000/face-id.png' }}
            style={[styles.faceIdIcon, { tintColor: Colors.textPrimary }]}
          />
          <Text style={styles.biometricText}>Iniciar con Face ID</Text>
        </PressableScale>
      )}

      <PressableScale style={styles.linkButton} onPress={() => navigation.navigate('ResetPassword')}>
        <Text style={styles.linkText}>¿Olvidaste tu contraseña?</Text>
      </PressableScale>

      <View style={styles.registerContainer}>
        <Text style={styles.registerText}>¿No tienes cuenta? </Text>
        <PressableScale onPress={() => navigation.navigate('Register')}>
          <Text style={styles.registerLink}>Regístrate</Text>
        </PressableScale>
      </View>
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
  rememberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.xs,
  },
  rememberText: {
    ...Typography.subheadline,
    color: Colors.textSecondary,
  },
  biometricButton: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
  faceIdIcon: {
    width: 45,
    height: 45,
    marginBottom: Spacing.sm,
  },
  biometricText: {
    ...Typography.subheadline,
    color: Colors.accent,
    fontWeight: '600',
  },
  linkButton: {
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  linkText: {
    ...Typography.subheadline,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.lg,
  },
  registerText: {
    ...Typography.subheadline,
    color: Colors.textSecondary,
  },
  registerLink: {
    ...Typography.subheadline,
    color: Colors.accent,
    fontWeight: '600',
  },
});
