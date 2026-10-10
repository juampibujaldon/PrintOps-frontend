// src/screens/LoginScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Alert, Switch, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Printer, ScanFace } from 'lucide-react-native';
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
import { Colors, Radius, Spacing, Typography } from '../constants/theme';
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
            // También BIOMETRICS_ENABLED=false: si no, RoleNavigator volvía a
            // preguntar lo mismo apenas se completaba el login.
            await AsyncStorage.multiSet([['BIOMETRICS_DECLINED', 'true'], ['BIOMETRICS_ENABLED', 'false']]);
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
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        'Error al iniciar sesión';

      Alert.alert('Error', message);
    } finally {
      setLoading(false);
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
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(500).springify().damping(22)} style={styles.header}>
          <View style={styles.logo}>
            <Printer color={Colors.onPrimary} size={30} strokeWidth={1.75} />
          </View>
          <Text style={styles.title}>PrintOps</Text>
          <Text style={styles.subtitle}>Ingresá a tu taller para gestionar tus impresoras.</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(80).springify().damping(22)}>
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
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="next"
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
                autoComplete="password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={handleSubmit(onSubmit)}
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
                <Text style={styles.rememberText}>Recordar sesión por 30 días</Text>
                <Switch
                  value={value}
                  onValueChange={onChange}
                  trackColor={{ false: Colors.fillPressed, true: Colors.green }}
                  ios_backgroundColor={Colors.fillPressed}
                />
              </View>
            )}
          />

          <Button title="Ingresar" onPress={handleSubmit(onSubmit)} loading={loading} />

          {biometricEnabled && (
            <Button
              title="Ingresar con Face ID"
              variant="tinted"
              icon={<ScanFace color={Colors.primary} size={20} strokeWidth={1.75} />}
              onPress={onBiometricLogin}
              style={styles.biometricButton}
            />
          )}

          <PressableScale style={styles.linkButton} onPress={() => navigation.navigate('ResetPassword')}>
            <Text style={styles.linkText}>¿Olvidaste tu contraseña?</Text>
          </PressableScale>
        </Animated.View>

        <View style={styles.registerContainer}>
          <Text style={styles.registerText}>¿No tenés cuenta? </Text>
          <PressableScale onPress={() => navigation.navigate('Register')}>
            <Text style={styles.registerLink}>Registrate</Text>
          </PressableScale>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: Colors.textPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.largeTitle,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.subheadline,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  rememberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.xs,
  },
  rememberText: {
    ...Typography.subheadline,
    color: Colors.textPrimary,
  },
  biometricButton: {
    marginTop: Spacing.md,
    borderRadius: Radius.md,
  },
  linkButton: {
    alignItems: 'center',
    marginTop: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  linkText: {
    ...Typography.subheadline,
    color: Colors.primary,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.xxl,
  },
  registerText: {
    ...Typography.subheadline,
    color: Colors.textSecondary,
  },
  registerLink: {
    ...Typography.subheadline,
    color: Colors.primary,
    fontWeight: '600',
  },
});
