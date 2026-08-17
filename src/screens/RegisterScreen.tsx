// src/screens/RegisterScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, Switch,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../hooks/useAuth';
import { RegisterFormData } from '../types/auth';
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
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password')], 'Las contraseñas no coinciden')
    .required('Debes confirmar la contraseña'),
  inviteToken: yup.string().optional(),
  workspaceName: yup.string().optional(),
});

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Register'>;
};

export default function RegisterScreen({ navigation }: Props) {
  const { register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isTecnico, setIsTecnico] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: yupResolver(schema),
    defaultValues: { email: '', password: '', confirmPassword: '', inviteToken: '', workspaceName: '' },
  });

  const onSubmit = async (data: RegisterFormData) => {
    if (isTecnico && !data.inviteToken?.trim()) {
      Alert.alert('Atención', 'Ingresá el código de invitación que te envió el manager.');
      return;
    }
    setLoading(true);
    try {
      const message = await register(
        data.email,
        data.password,
        isTecnico ? data.inviteToken?.trim() : undefined,
        isTecnico ? undefined : data.workspaceName?.trim(),
      );
      Alert.alert('Verificá tu email', message, [
        { text: 'Entendido', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        'Error al registrarse';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Crear cuenta</Text>

      <View style={styles.modeRow}>
        <Text style={styles.modeText}>Soy técnico (tengo invitación)</Text>
        <Switch value={isTecnico} onValueChange={setIsTecnico} />
      </View>

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
        name="confirmPassword"
        render={({ field: { onChange, value } }) => (
          <View style={styles.fieldContainer}>
            <TextInput
              style={[styles.input, errors.confirmPassword && styles.inputError]}
              placeholder="Confirmar Contraseña"
              secureTextEntry
              value={value}
              onChangeText={onChange}
            />
            {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword.message}</Text>}
          </View>
        )}
      />

      {isTecnico ? (
        <Controller
          control={control}
          name="inviteToken"
          render={({ field: { onChange, value } }) => (
            <View style={styles.fieldContainer}>
              <TextInput
                style={[styles.input, errors.inviteToken && styles.inputError]}
                placeholder="Código de invitación"
                autoCapitalize="characters"
                autoCorrect={false}
                value={value}
                onChangeText={onChange}
              />
              {errors.inviteToken && <Text style={styles.errorText}>{errors.inviteToken.message}</Text>}
            </View>
          )}
        />
      ) : (
        <Controller
          control={control}
          name="workspaceName"
          render={({ field: { onChange, value } }) => (
            <View style={styles.fieldContainer}>
              <TextInput
                style={[styles.input, errors.workspaceName && styles.inputError]}
                placeholder="Nombre del taller (opcional)"
                value={value}
                onChangeText={onChange}
              />
              {errors.workspaceName && <Text style={styles.errorText}>{errors.workspaceName.message}</Text>}
            </View>
          )}
        />
      )}

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSubmit(onSubmit)}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={Colors.background} />
        ) : (
          <Text style={styles.buttonText}>{isTecnico ? 'Unirme al taller' : 'Crear taller'}</Text>
        )}
      </TouchableOpacity>

      <View style={styles.loginContainer}>
        <Text style={styles.loginText}>¿Ya tienes cuenta? </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.loginLink}>Iniciar sesión</Text>
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
    marginBottom: 24,
    textAlign: 'center',
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  modeText: {
    fontSize: 15,
    color: Colors.textSecondary,
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
  button: {
    backgroundColor: Colors.primaryButton,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
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
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  loginText: {
    color: Colors.textSecondary,
    fontSize: 15,
  },
  loginLink: {
    color: Colors.accent,
    fontSize: 15,
    fontWeight: '600',
  },
});
