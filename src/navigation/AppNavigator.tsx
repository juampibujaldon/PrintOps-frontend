// src/navigation/AppNavigator.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import VerifyEmailScreen from '../screens/VerifyEmailScreen';
import InviteErrorScreen, { InviteErrorCode } from '../screens/InviteErrorScreen';
import RoleNavigator from './RoleNavigator';
import { useAuth } from '../hooks/useAuth';
import { navigationTheme } from './navTheme';

export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  // mode 'create': abre el registro en "Crear taller" (desde la pantalla de invitación inválida).
  Register: { mode?: 'create' } | undefined;
  VerifyEmail: { email: string };
  ResetPassword: undefined;
  InviteError: { code: InviteErrorCode; email?: string; message?: string };
  Role: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();
  // La animación del logo se ve completa solo en el arranque de la app. Después
  // (p. ej. durante el login) el splash dura únicamente lo que dura la carga.
  const [introDone, setIntroDone] = useState(false);
  const finishIntro = useCallback(() => setIntroDone(true), []);
  // Red de seguridad: si por algún motivo la animación no avisa, no quedarse en el splash.
  useEffect(() => {
    const t = setTimeout(finishIntro, 6000);
    return () => clearTimeout(t);
  }, [finishIntro]);
  const showSplash = isLoading || !introDone;

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade', animationDuration: 280 }}>
        {showSplash ? (
          <Stack.Screen name="Splash">
            {() => <SplashScreen onFinish={introDone ? undefined : finishIntro} />}
          </Stack.Screen>
        ) : isAuthenticated ? (
          <Stack.Screen name="Role" component={RoleNavigator} />
        ) : (
          <Stack.Group>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="InviteError" component={InviteErrorScreen} options={{ animation: 'slide_from_bottom' }} />
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
