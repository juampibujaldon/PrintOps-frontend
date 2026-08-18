// src/services/authService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as Keychain from 'react-native-keychain';
import ReactNativeBiometrics from 'react-native-biometrics';
import { API_BASE_URL, STORAGE_KEYS } from '../constants/api';
import { AuthResponse } from '../types/auth';

// Genera un UUID v4 simple sin dependencias externas
function generateDeviceId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function getOrCreateDeviceId(): Promise<string> {
  let deviceId = await AsyncStorage.getItem(STORAGE_KEYS.DEVICE_ID);
  if (!deviceId) {
    deviceId = generateDeviceId();
    await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_ID, deviceId);
  }
  return deviceId;
}

async function login(email: string, password: string, rememberMe: boolean): Promise<AuthResponse> {
  const deviceId = await getOrCreateDeviceId();

  const { data } = await axios.post<AuthResponse>(`${API_BASE_URL}/api/auth/login`, {
    email,
    password,
    deviceId,
    rememberMe,
  });

  await AsyncStorage.multiSet([
    [STORAGE_KEYS.ACCESS_TOKEN, data.accessToken],
    [STORAGE_KEYS.USER, JSON.stringify(data.user)],
  ]);

  // Guardar Refresh Token en Keychain de forma segura
  await Keychain.setGenericPassword('refreshToken', data.refreshToken, { service: 'refreshTokenService' });

  return data;
}

async function logout(deviceId: string, token: string): Promise<void> {
  const biometricsEnabled = await AsyncStorage.getItem('BIOMETRICS_ENABLED');
  const keepSession = biometricsEnabled === 'true';

  try {
    // keepSession=true → backend solo invalida el access token, no el refresh token.
    // Esto permite que Face ID renueve la sesión la próxima vez.
    await axios.post(
      `${API_BASE_URL}/api/auth/logout?deviceId=${deviceId}&keepSession=${keepSession}`,
      {},
      { headers: { Authorization: `Bearer ${token}` } },
    );
  } finally {
    if (keepSession) {
      // Soft logout: solo se borra el access token local.
      // El refresh token (Keychain) y el user quedan para Face ID.
      await AsyncStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    } else {
      // Hard logout: se borra todo.
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.USER,
        'BIOMETRICS_ENABLED',
      ]);
      await Keychain.resetGenericPassword({ service: 'refreshTokenService' });
    }
  }
}

/**
 * Restaura la sesión al arrancar la app o al usar Face ID.
 *
 * skipBiometrics = true → el llamador ya verificó la identidad (botón Face ID).
 *
 * Flujos soportados:
 *  A) App arranca con access token válido → refresca para traer usuario fresco → restaura.
 *  B) App arranca, BIOMETRICS_ENABLED=true y no hay access token (soft logout) →
 *     pide Face ID → llama /refresh → obtiene nuevo access token → restaura.
 *  C) Botón Face ID en LoginScreen → skipBiometrics=true → llama /refresh → restaura.
 */
async function restoreSession(skipBiometrics = false): Promise<AuthResponse | null> {
  const credentials = await Keychain.getGenericPassword({ service: 'refreshTokenService' });
  const refreshToken = credentials ? credentials.password : null;
  const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  const userStr = await AsyncStorage.getItem(STORAGE_KEYS.USER);

  if (!refreshToken || !userStr) {
    if (skipBiometrics) {
      throw new Error('No hay una sesión guardada para restaurar con Face ID. Iniciá sesión con contraseña.');
    }
    return null;
  }

  const biometricsEnabled = await AsyncStorage.getItem('BIOMETRICS_ENABLED');

  // Si no hay access token local (soft logout) y la biometría está habilitada,
  // pedimos verificación biométrica antes de renovar la sesión.
  const needsBiometricPrompt = !token && biometricsEnabled === 'true' && !skipBiometrics;

  if (needsBiometricPrompt) {
    const rnBiometrics = new ReactNativeBiometrics();
    const { available } = await rnBiometrics.isSensorAvailable();

    if (available) {
      try {
        const { success } = await rnBiometrics.simplePrompt({
          promptMessage: 'Inicia sesión para continuar',
        });
        if (!success) return null;
      } catch (error) {
        console.log('Biometrics error', error);
        return null;
      }
    }
  }

  // Siempre intentamos refrescar para obtener token y usuario frescos
  // (rol/workspaceId actualizados, ej. tras cambios de rol).
  try {
    const deviceId = await getOrCreateDeviceId();
    const { data } = await axios.post<AuthResponse>(`${API_BASE_URL}/api/auth/refresh`, {
      refreshToken,
      deviceId,
    });

    await AsyncStorage.multiSet([
      [STORAGE_KEYS.ACCESS_TOKEN, data.accessToken],
      [STORAGE_KEYS.USER, JSON.stringify(data.user)],
    ]);
    await Keychain.setGenericPassword('refreshToken', data.refreshToken, {
      service: 'refreshTokenService',
    });

    return data;
  } catch (error: any) {
    const networkError = !error.response;

    // Error de red (backend caído): usamos el token guardado para no sacar al usuario.
    if (networkError && token) {
      return {
        accessToken: token,
        refreshToken,
        expiresIn: 900,
        user: JSON.parse(userStr),
      };
    }

    // Refresh token inválido/expirado → sesión terminada definitivamente.
    await AsyncStorage.multiRemove([STORAGE_KEYS.ACCESS_TOKEN, STORAGE_KEYS.USER, 'BIOMETRICS_ENABLED']);
    await Keychain.resetGenericPassword({ service: 'refreshTokenService' });

    if (skipBiometrics) {
      throw new Error('Tu sesión expiró. Iniciá sesión con contraseña nuevamente.');
    }
    return null;
  }
}

async function register(
  email: string,
  password: string,
  inviteToken?: string,
  workspaceName?: string,
): Promise<string> {
  const { data } = await axios.post<{ message?: string }>(`${API_BASE_URL}/api/auth/register`, {
    email,
    password,
    inviteToken: inviteToken || undefined,
    workspaceName: workspaceName || undefined,
  });
  return data.message ?? 'Usuario registrado. Verificá tu email para activar tu cuenta.';
}

async function resendVerification(email: string): Promise<string> {
  const { data } = await axios.post<{ message?: string }>(`${API_BASE_URL}/api/auth/resend-verification`, {
    email,
  });
  return data.message ?? 'Reenviamos el email de verificación.';
}

async function forgotPassword(email: string): Promise<string> {
  const { data } = await axios.post<{ message?: string }>(`${API_BASE_URL}/api/auth/forgot-password`, {
    email,
  });
  return data.message ?? 'Si el email existe, recibirás instrucciones de reset.';
}

async function resetPassword(token: string, newPassword: string): Promise<string> {
  const { data } = await axios.post<{ message?: string }>(`${API_BASE_URL}/api/auth/reset-password`, {
    token,
    newPassword,
  });
  return data.message ?? 'Contraseña restablecida correctamente.';
}

async function enableBiometrics(): Promise<boolean> {
  const rnBiometrics = new ReactNativeBiometrics();
  const { available } = await rnBiometrics.isSensorAvailable();
  if (available) {
    const { success } = await rnBiometrics.simplePrompt({
      promptMessage: 'Activa biometría para PrintOps',
    });
    if (success) {
      await AsyncStorage.setItem('BIOMETRICS_ENABLED', 'true');
      return true;
    }
  }
  return false;
}

export const authService = { login, logout, register, resendVerification, restoreSession, getOrCreateDeviceId, enableBiometrics, forgotPassword, resetPassword };
