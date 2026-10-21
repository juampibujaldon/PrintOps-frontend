// src/components/auth/GoogleSignInButton.tsx
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../context/ToastContext';
import { googleErrorMessage } from '../../services/authService';
import { GoogleSignInError, isGoogleSignInConfigured } from '../../services/googleAuth';
import { Radius, Spacing } from '../../constants/theme';
import PressableScale from '../ui/PressableScale';

export function GoogleLogo({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </Svg>
  );
}

type Props = { rememberMe?: boolean };

// Botón "Continuar con Google" (branding de Google: fondo blanco, borde, logo "G").
// No se renderiza si no hay GOOGLE_WEB_CLIENT_ID configurado.
export default function GoogleSignInButton({ rememberMe = false }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { signInWithGoogle } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  if (!isGoogleSignInConfigured()) {return null;}

  const onPress = async () => {
    setLoading(true);
    try {
      const result = await signInWithGoogle(rememberMe);
      if (result.type === 'onboarding') {
        navigation.navigate('GoogleOnboarding', {
          onboardingToken: result.onboardingToken,
          email: result.email,
          name: result.name,
          rememberMe,
        });
      }
      // 'authenticated': el AppNavigator cambia solo. 'cancelled': silencioso.
    } catch (error: any) {
      showToast(error instanceof GoogleSignInError ? error.message : googleErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PressableScale
      onPress={onPress}
      disabled={loading}
      style={styles.button}
      accessibilityRole="button"
      accessibilityLabel="Continuar con Google"
      accessibilityState={{ disabled: loading, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator color="#3C4043" />
      ) : (
        <View style={styles.content}>
          <GoogleLogo />
          <Text style={styles.text}>Continuar con Google</Text>
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 50,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DADCE0',
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  text: { fontSize: 16, fontWeight: '500', color: '#3C4043' },
});

