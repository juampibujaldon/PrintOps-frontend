// src/services/authService.ts
// Usa axios "plano" (sin interceptors): login/refresh/logout no deben reintentar por 401.
import axios from 'axios';
import { googleLogout } from '@react-oauth/google';
import { API_BASE_URL } from '../constants/api';
import { AuthResponse } from '../types/auth';
import {
  clearSession,
  getAccessToken,
  getOrCreateDeviceId,
  getRefreshToken,
  getUser,
  saveSession,
  updateSession,
} from './storage';

// Persistencia común a todos los logins (contraseña y Google).
function persistSession(data: AuthResponse, rememberMe: boolean): void {
  saveSession(data, rememberMe);
}

async function login(email: string, password: string, rememberMe: boolean): Promise<AuthResponse> {
  const deviceId = getOrCreateDeviceId();

  const { data } = await axios.post<AuthResponse>(`${API_BASE_URL}/api/auth/login`, {
    email,
    password,
    deviceId,
    rememberMe,
  });

  persistSession(data, rememberMe);
  return data;
}

async function logout(deviceId: string, fallbackToken: string): Promise<void> {
  // El interceptor de axios renueva el access token en storage sin pasar por el
  // estado de React: usamos el más reciente para que /logout no responda 401.
  const token = getAccessToken() ?? fallbackToken;

  try {
    // Sin soft-logout en web: keepSession siempre false (el backend invalida el refresh token).
    await axios.post(
      `${API_BASE_URL}/api/auth/logout?deviceId=${encodeURIComponent(deviceId)}&keepSession=false`,
      {},
      { headers: { Authorization: `Bearer ${token}` } },
    );
  } finally {
    // Para que la próxima vez aparezca el selector de cuentas de Google.
    try {
      googleLogout();
    } catch {
      // no debe bloquear el logout
    }
    clearSession();
  }
}

/**
 * Restaura la sesión al arrancar la app.
 * Siempre intenta refrescar para traer token y usuario frescos (rol/workspaceId
 * actualizados). Devuelve null si no hay sesión o el refresh token es inválido.
 */
async function restoreSession(): Promise<AuthResponse | null> {
  const refreshToken = getRefreshToken();
  const token = getAccessToken();
  const user = getUser();

  if (!refreshToken || !user) return null;

  try {
    const deviceId = getOrCreateDeviceId();
    const { data } = await axios.post<AuthResponse>(`${API_BASE_URL}/api/auth/refresh`, {
      refreshToken,
      deviceId,
    });
    updateSession(data);
    return data;
  } catch (error) {
    const networkError = axios.isAxiosError(error) && !error.response;

    // Error de red (backend caído): usamos el token guardado para no sacar al usuario.
    if (networkError && token) {
      return { accessToken: token, refreshToken, expiresIn: 900, user };
    }

    // Refresh token inválido/expirado: sesión terminada definitivamente.
    clearSession();
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
  return data.message ?? 'Usuario registrado. Ya podés iniciar sesión.';
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

async function verifyEmail(token: string): Promise<string> {
  const { data } = await axios.post<{ message?: string }>(`${API_BASE_URL}/api/auth/verify-email`, {
    token,
  });
  return data.message ?? 'Email verificado correctamente.';
}

export type GoogleLoginResult =
  | { type: 'authenticated'; auth: AuthResponse }
  | { type: 'onboarding'; onboardingToken: string; email: string; name: string | null };

/** idToken = `credential` que devuelve <GoogleLogin /> de @react-oauth/google. */
async function loginWithGoogle(idToken: string, deviceId: string, rememberMe: boolean): Promise<GoogleLoginResult> {
  const res = await axios.post(`${API_BASE_URL}/api/auth/google`, { idToken, deviceId, rememberMe });
  if (res.status === 202) {
    const { onboardingToken, email, name } = res.data;
    return { type: 'onboarding', onboardingToken, email, name: name ?? null };
  }
  persistSession(res.data as AuthResponse, rememberMe);
  return { type: 'authenticated', auth: res.data as AuthResponse };
}

async function completeGoogleOnboarding(
  onboardingToken: string,
  deviceId: string,
  rememberMe: boolean,
  choice: { inviteToken?: string; workspaceName?: string },
): Promise<AuthResponse> {
  const { data } = await axios.post<AuthResponse>(`${API_BASE_URL}/api/auth/google/complete`, {
    onboardingToken,
    deviceId,
    rememberMe,
    inviteToken: choice.inviteToken || null,
    workspaceName: choice.workspaceName || null,
  });
  persistSession(data, rememberMe);
  return data;
}

interface HttpErrorLike {
  message?: string;
  response?: { status?: number; data?: { message?: string } };
}

/** Mensaje en español para los errores HTTP de /api/auth/google. */
export function googleErrorMessage(error: unknown): string {
  const e = error as HttpErrorLike;
  switch (e?.response?.status) {
    case 401: return 'Google rechazó el inicio de sesión. Probá de nuevo.';
    case 403: return 'Tu cuenta está deshabilitada. Contactá al administrador.';
    case 503: return 'El inicio de sesión con Google no está disponible en este momento.';
    default:
      return e?.response?.data?.message || e?.message || 'No se pudo iniciar sesión con Google';
  }
}

/** Mensaje de error genérico de un error axios (message > error > fallback). */
export function apiErrorMessage(error: unknown, fallback: string): string {
  const e = error as { response?: { data?: { message?: string; error?: string } } };
  return e?.response?.data?.message || e?.response?.data?.error || fallback;
}

export const authService = {
  loginWithGoogle,
  completeGoogleOnboarding,
  login,
  logout,
  register,
  resendVerification,
  verifyEmail,
  restoreSession,
  getOrCreateDeviceId,
  forgotPassword,
  resetPassword,
};
