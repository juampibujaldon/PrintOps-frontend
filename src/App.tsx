import type { ReactNode } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { RouterProvider } from 'react-router-dom';
import type { createBrowserRouter } from 'react-router-dom';
import { GOOGLE_WEB_CLIENT_ID, isGoogleSignInConfigured } from './constants/google';
import { AuthProvider } from './context/AuthContext';
import { ConfirmProvider } from './context/ConfirmContext';
import { ToastProvider } from './context/ToastContext';
import WebSocketToasts from './context/WebSocketToasts';

// Proveedores globales: Google OAuth > Toast > Confirm > Auth. El router se inyecta (en tests es un memory router).
export function AppProviders({ children }: { children: ReactNode }) {
  const tree = (
    <ToastProvider>
      <ConfirmProvider>
        <AuthProvider>
          <WebSocketToasts />
          {children}
        </AuthProvider>
      </ConfirmProvider>
    </ToastProvider>
  );
  // Sin client id no se carga el script de Google (el botón tampoco se renderiza).
  return isGoogleSignInConfigured() ? (
    <GoogleOAuthProvider clientId={GOOGLE_WEB_CLIENT_ID}>{tree}</GoogleOAuthProvider>
  ) : (
    tree
  );
}

export default function App({ router }: { router: ReturnType<typeof createBrowserRouter> }) {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
