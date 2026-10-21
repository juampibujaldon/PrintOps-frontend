// App.tsx
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from './src/context/AuthContext';
import { ToastProvider } from './src/context/ToastContext';
import AppNavigator from './src/navigation/AppNavigator';
import Toast from 'react-native-toast-message';
import { configureGoogleSignIn } from './src/services/googleAuth';

// Una sola vez al arrancar (no hace nada si GOOGLE_WEB_CLIENT_ID está vacío).
configureGoogleSignIn();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ToastProvider>
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      </ToastProvider>
      <Toast />
    </GestureHandlerRootView>
  );
}
