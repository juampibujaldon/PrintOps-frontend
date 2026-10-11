// src/navigation/AppNavigator.tsx
import React from 'react';
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

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade', animationDuration: 280 }}>
        {isLoading ? (
          <Stack.Screen name="Splash" component={SplashScreen} />
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
