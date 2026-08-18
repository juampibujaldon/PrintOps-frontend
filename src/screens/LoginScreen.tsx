// src/screens/LoginScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, Switch, Image
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
import { STORAGE_KEYS } from '../constants/api';
import { LoginFormData } from '../types/auth';
import { Colors } from '../constants/theme';

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
  // Solo true si el hardware está disponible Y el usuario habilitó Face ID explícitamente
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: yupResolver(schema),
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  // Verificar disponibilidad biométrica al montar
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
            if (ok) {
              setBiometricEnabled(true);
            } else {
              // Si falla la biometría por alguna razón, no lo marcamos como activado
              // ni lo declinamos permanentemente.
            }
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
      // Preguntar si quiere activar Face ID ANTES de hacer login y cambiar de pantalla.
      const declined = await AsyncStorage.getItem('BIOMETRICS_DECLINED');
      if (biometricAvailable && !biometricEnabled && declined !== 'true') {
        await promptFaceIdAsync();
      }

      // Ahora sí hacemos login
      await login(data.email, data.password, data.rememberMe);
    } catch (error: any) {
      const status = error?.response?.status;
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        'Error al iniciar sesión';

      // Email sin verificar: ofrecer reenvío del enlace.
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
        // Intentar restaurar la sesión usando el token guardado en el Keychain.
        // skipBiometrics=true porque ya verificamos la identidad arriba.
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

      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, value } }) => (
          <View style={styles.fieldContainer}>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              placeholder="Email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={value}
              onChangeText={onChange}
            />
            {errors.email && <Text style={styles.errorText}>{errors.email.message}</Text>}
          </View>
        )}
      />

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, value } }) => (
          <View style={styles.fieldContainer}>
            <TextInput
              style={[styles.input, errors.password && styles.inputError]}
              placeholder="Contraseña"
              secureTextEntry
              value={value}
              onChangeText={onChange}
            />
            {errors.password && <Text style={styles.errorText}>{errors.password.message}</Text>}
          </View>
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

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSubmit(onSubmit)}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={Colors.background} />
        ) : (
          <Text style={styles.buttonText}>Ingresar</Text>
        )}
      </TouchableOpacity>

      {biometricEnabled && (
        <TouchableOpacity style={styles.biometricButton} onPress={onBiometricLogin}>
          <Image 
            source={{ uri: 'https://img.icons8.com/ios/100/000000/face-id.png' }} 
            style={[styles.faceIdIcon, { tintColor: Colors.textPrimary }]} 
          />
          <Text style={styles.biometricText}>Iniciar con Face ID</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.forgotButton} onPress={() => navigation.navigate('ResetPassword')}>
        <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
      </TouchableOpacity>

      <View style={styles.registerContainer}>
        <Text style={styles.registerText}>¿No tienes cuenta? </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={styles.registerLink}>Regístrate</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 32,
    textAlign: 'center',
  },
  fieldContainer: {
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: Colors.inputBackground,
    color: Colors.textPrimary,
  },
  inputError: {
    borderColor: Colors.error,
  },
  errorText: {
    color: Colors.error,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  rememberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  rememberText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  button: {
    backgroundColor: Colors.primaryButton,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  biometricButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  faceIdIcon: {
    width: 45,
    height: 45,
    marginBottom: 8,
  },
  biometricText: {
    color: Colors.accent,
    fontSize: 15,
    fontWeight: '500',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  forgotButton: {
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 8,
  },
  forgotText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  registerText: {
    color: Colors.textSecondary,
    fontSize: 15,
  },
  registerLink: {
    color: Colors.accent,
    fontSize: 15,
    fontWeight: '600',
  },
});
