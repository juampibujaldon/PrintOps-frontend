// src/screens/GoogleOnboardingScreen.tsx
// Paso final del "Continuar con Google" cuando el email no tiene cuenta:
// crear un taller nuevo o unirse a uno con código de invitación.
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { InviteErrorCode } from './InviteErrorScreen';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../context/ToastContext';
import { Colors, Spacing, Typography } from '../constants/theme';
import TextField from '../components/ui/TextField';
import Button from '../components/ui/Button';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'GoogleOnboarding'>;
  route: RouteProp<RootStackParamList, 'GoogleOnboarding'>;
};

type Mode = 'create' | 'invite';

export default function GoogleOnboardingScreen({ navigation, route }: Props) {
  const { onboardingToken, email, rememberMe } = route.params;
  const { completeGoogleOnboarding } = useAuth();
  const { showToast } = useToast();
  const [mode, setMode] = useState<Mode>('create');
  const [workspaceName, setWorkspaceName] = useState('');
  const [inviteToken, setInviteToken] = useState('');
  const [codeError, setCodeError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  const defaultName = `Taller de ${email}`;

  const onSubmit = async () => {
    setCodeError(undefined);
    const code = inviteToken.trim();
    if (mode === 'invite' && !code) {
      setCodeError('Ingresá el código de invitación');
      return;
    }
    setLoading(true);
    try {
      await completeGoogleOnboarding(
        onboardingToken,
        rememberMe,
        mode === 'invite' ? { inviteToken: code } : { workspaceName: workspaceName.trim() || defaultName },
      );
      // Autenticado: el AppNavigator reemplaza el stack de auth por la app.
    } catch (error: any) {
      const status: number | undefined = error?.response?.status;
      const errorCode: string | undefined = error?.response?.data?.code;
      const message: string | undefined = error?.response?.data?.message;
      if (status === 401) {
        showToast('La verificación con Google venció. Volvé a intentarlo.');
        navigation.navigate('Login');
      } else if (status === 409) {
        showToast(message || 'Ese email ya tiene una cuenta.');
        navigation.navigate('Login');
      } else if (errorCode?.startsWith('INVITE_')) {
        navigation.navigate('InviteError', { code: errorCode as InviteErrorCode, email, message });
      } else {
        showToast(message || 'No se pudo completar el registro. Probá de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  const options: { label: string; value: Mode }[] = [
    { label: 'Crear mi taller', value: 'create' },
    { label: 'Unirme con un código de invitación', value: 'invite' },
  ];

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>¡Casi listo!</Text>
        <Text style={styles.subtitle}>Vas a entrar con tu cuenta de Google:</Text>
        <Text style={styles.email}>{email}</Text>

        <View style={styles.options}>
          {options.map(opt => {
            const active = mode === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => setMode(opt.value)}
                style={[styles.option, active && styles.optionActive]}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.optionText, active && styles.optionTextActive]}>{opt.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {mode === 'create' ? (
          <TextField
            label="Nombre del taller (opcional)"
            placeholder={defaultName}
            value={workspaceName}
            onChangeText={setWorkspaceName}
          />
        ) : (
          <TextField
            label="Código de invitación"
            placeholder="Código enviado por el manager"
            autoCapitalize="none"
            autoCorrect={false}
            value={inviteToken}
            onChangeText={setInviteToken}
            error={codeError}
          />
        )}

        <Button title="Continuar" onPress={onSubmit} loading={loading} />
        <Button title="Cancelar" variant="ghost" onPress={() => navigation.navigate('Login')} style={styles.cancel} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  container: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.xxl },
  title: { ...Typography.largeTitle, color: Colors.textPrimary, marginBottom: Spacing.xs },
  subtitle: { ...Typography.subheadline, color: Colors.textSecondary },
  email: { ...Typography.headline, color: Colors.textPrimary, marginBottom: Spacing.xl },
  options: { marginBottom: Spacing.xl, gap: Spacing.sm },
  option: {
    padding: Spacing.md,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.fill,
    backgroundColor: Colors.surface,
  },
  optionActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryTint },
  optionText: { ...Typography.subheadline, color: Colors.textPrimary },
  optionTextActive: { color: Colors.primary, fontWeight: '600' },
  cancel: { marginTop: Spacing.sm },
});
