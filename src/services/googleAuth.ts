// src/services/googleAuth.ts
// Envoltorio fino sobre @react-native-google-signin: solo obtiene el idToken de Google.
import { Platform } from 'react-native';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { GOOGLE_IOS_CLIENT_ID, GOOGLE_WEB_CLIENT_ID } from '../constants/google';

export class GoogleSignInError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GoogleSignInError';
  }
}

// En iOS el configure nativo rechaza sin iosClientId (no usamos GoogleService-Info.plist).
export function isGoogleSignInConfigured(): boolean {
  const hasWeb = GOOGLE_WEB_CLIENT_ID.trim().length > 0;
  const hasIos = GOOGLE_IOS_CLIENT_ID.trim().length > 0;
  return hasWeb && (Platform.OS !== 'ios' || hasIos);
}

export function configureGoogleSignIn(): void {
  if (!isGoogleSignInConfigured()) {
    return;
  }
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
  });
}

/**
 * Abre el selector de cuentas de Google. Devuelve el idToken, o null si el usuario
 * canceló o ya hay un inicio en curso (casos silenciosos, sin toast).
 */
export async function getGoogleIdToken(): Promise<string | null> {
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const result = await GoogleSignin.signIn();
    if (result.type !== 'success') {
      return null;
    }
    const idToken = result.data.idToken;
    if (!idToken) {
      throw new GoogleSignInError('Google no devolvió credenciales. Probá de nuevo.');
    }
    return idToken;
  } catch (error: any) {
    if (error instanceof GoogleSignInError) {
      throw error;
    }
    switch (error?.code) {
      case statusCodes.SIGN_IN_CANCELLED:
      case statusCodes.IN_PROGRESS:
        return null;
      case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
        throw new GoogleSignInError('Google Play Services no está disponible o está desactualizado en este dispositivo.');
      default:
        throw new GoogleSignInError('No se pudo iniciar sesión con Google. Probá de nuevo.');
    }
  }
}

/** Cierra la sesión de Google para que la próxima vez aparezca el selector de cuentas. */
export async function signOutFromGoogle(): Promise<void> {
  try {
    await GoogleSignin.signOut();
  } catch {
    // Ignorado a propósito: no debe bloquear el logout de la app.
  }
}
