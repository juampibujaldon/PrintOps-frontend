// src/screens/RegisterScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Alert, Pressable, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../hooks/useAuth';
import { RegisterFormData } from '../types/auth';
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
      Alert.alert('¡Éxito!', message, [
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
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView style={styles.flex} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
    <Animated.View entering={FadeInDown.duration(450).springify().damping(22)}>
      <Text style={styles.title}>Crear cuenta</Text>
      <Text style={styles.subtitle}>Creá tu taller o unite a uno existente con una invitación.</Text>

      <View style={styles.segment}>
        {[{ label: 'Crear taller', value: false }, { label: 'Tengo invitación', value: true }].map(opt => {
          const active = isTecnico === opt.value;
          return (
            <Pressable
              key={opt.label}
              onPress={() => setIsTecnico(opt.value)}
              style={[styles.segmentItem, active && styles.segmentItemActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>

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
        name="confirmPassword"
        render={({ field: { onChange, value } }) => (
          <TextField
            label="Confirmar contraseña"
            placeholder="Repetí la contraseña"
            secureTextEntry
            value={value}
            onChangeText={onChange}
            error={errors.confirmPassword?.message}
          />
        )}
      />

      {isTecnico ? (
        <Controller
          control={control}
          name="inviteToken"
          render={({ field: { onChange, value } }) => (
            <TextField
              label="Código de invitación"
              placeholder="Código enviado por el manager"
              autoCapitalize="none"
              autoCorrect={false}
              value={value}
              onChangeText={onChange}
              error={errors.inviteToken?.message}
            />
          )}
        />
      ) : (
        <Controller
          control={control}
          name="workspaceName"
          render={({ field: { onChange, value } }) => (
            <TextField
              label="Nombre del taller (opcional)"
              placeholder="Ej. Taller Central"
              value={value}
              onChangeText={onChange}
              error={errors.workspaceName?.message}
            />
          )}
        />
      )}

      <Button
        title={isTecnico ? 'Unirme al taller' : 'Crear taller'}
        onPress={handleSubmit(onSubmit)}
        loading={loading}
      />

      <View style={styles.loginContainer}>
        <Text style={styles.loginText}>¿Ya tienes cuenta? </Text>
        <PressableScale onPress={() => navigation.navigate('Login')}>
          <Text style={styles.loginLink}>Iniciar sesión</Text>
        </PressableScale>
      </View>
    </Animated.View>
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
  title: {
    ...Typography.largeTitle,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.subheadline,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
  },
  // Control segmentado estilo iOS.
  segment: {
    flexDirection: 'row',
    backgroundColor: Colors.fill,
    borderRadius: 9,
    padding: 2,
    marginBottom: Spacing.xl,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 7,
    alignItems: 'center',
  },
  segmentItemActive: {
    backgroundColor: Colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentText: { fontSize: 13, fontWeight: '500', color: Colors.textPrimary },
  segmentTextActive: { fontWeight: '600' },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.xl,
  },
  loginText: {
    ...Typography.subheadline,
    color: Colors.textSecondary,
  },
  loginLink: {
    ...Typography.subheadline,
    color: Colors.primary,
    fontWeight: '600',
  },
});
