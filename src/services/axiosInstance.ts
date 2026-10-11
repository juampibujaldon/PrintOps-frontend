// src/services/axiosInstance.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import { API_BASE_URL, STORAGE_KEYS } from '../constants/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  // No fijamos Content-Type por defecto: axios lo genera solo
  // (application/json para objetos y multipart/form-data con boundary para FormData).
});

// ── Request interceptor: adjunta el Bearer token y loguea el request ──
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (__DEV__) {
      console.log(
        `[API] ${config.method?.toUpperCase()} ${fullUrl(config)}`,
        '| auth:', config.headers.Authorization ? 'Bearer ***' : 'NONE',
      );
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Los services pasan URLs absolutas (`${API_BASE_URL}/api/...`); en ese caso
// axios ignora baseURL, así que el log no debe concatenarlo (salía duplicado).
function fullUrl(config?: InternalAxiosRequestConfig): string {
  const url = config?.url ?? '';
  return /^https?:\/\//.test(url) ? url : `${config?.baseURL ?? ''}${url}`;
}

// El backend responde los errores de validación (@Valid) como una lista
// [{ field, message }] en vez de { message }. Las pantallas leen
// `error.response.data.message`, así que la armamos acá para todas.
const FIELD_LABELS: Record<string, string> = {
  filamentGrams: 'Filamento (gramos)',
  filamentPricePerGram: 'Precio por gramo',
  filamentType: 'Tipo de filamento',
  printerWatts: 'Potencia (watts)',
  energyPriceKwh: 'Precio de energía (kWh)',
  printingHours: 'Horas de impresión',
  designHours: 'Horas de diseño',
  designHourlyRate: 'Tarifa de diseño',
  operatorHourlyRate: 'Tarifa de operador',
  marginPercent: 'Margen (%)',
  discountPercent: 'Descuento (%)',
  units: 'Unidades',
};

function normalizeValidationErrors(error: AxiosError) {
  const data = error.response?.data as unknown;
  if (!Array.isArray(data) || data.length === 0) return;
  const lines = data
    .filter((e: any) => e && typeof e.message === 'string')
    .map((e: any) => {
      const label = FIELD_LABELS[e.field];
      // "marginPercent no puede superar 100" → "Margen (%): no puede superar 100"
      return label ? `${label}: ${e.message.replace(new RegExp(`^${e.field}\\s*`), '')}` : e.message;
    });
  if (lines.length > 0) {
    (error.response as any).data = { error: 'Datos inválidos', message: lines.join('\n'), fields: data };
  }
}

// Callback que registra AuthContext para cerrar la sesión en la UI cuando el
// refresh token ya no sirve (si no, la app quedaba "logueada" con todo en 401).
let onSessionExpired: (() => void) | null = null;
export const setOnSessionExpired = (cb: (() => void) | null) => {
  onSessionExpired = cb;
};

// ── Refresh del access token (compartido por axios y el WebSocket) ──
// Si varias requests (o el WebSocket) lo piden a la vez, se hace un solo refresh
// y todas esperan la misma promesa.
let refreshPromise: Promise<string> | null = null;

export function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function doRefresh(): Promise<string> {
  try {
    const credentials = await Keychain.getGenericPassword({ service: 'refreshTokenService' });
    const refreshToken = credentials ? credentials.password : null;
    const deviceId = await AsyncStorage.getItem(STORAGE_KEYS.DEVICE_ID);

    if (!refreshToken || !deviceId) {
      throw new Error('No hay refresh token');
    }

    const { data } = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
      refreshToken,
      deviceId,
    });

    await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.accessToken);
    if (data.refreshToken) {
      await Keychain.setGenericPassword('refreshToken', data.refreshToken, {
        service: 'refreshTokenService',
      });
    }
    return data.accessToken;
  } catch (refreshError) {
    // Solo limpiamos el access token local. BIOMETRICS_ENABLED y el Keychain
    // se limpian en authService si el refresh token está definitivamente inválido.
    await AsyncStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    // Error de red: puede ser transitorio, no se cierra la sesión.
    const isNetworkError = axios.isAxiosError(refreshError) && !refreshError.response;
    if (!isNetworkError) {
      onSessionExpired?.();
    }
    throw refreshError;
  }
}

// ── Response interceptor: refresca el token ante 401 ──

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const status = error.response?.status;

    normalizeValidationErrors(error);

    if (__DEV__) {
      console.log(`[API] response ${status} ${originalRequest?.method?.toUpperCase()} ${fullUrl(originalRequest)}`);
      // En 4xx el body dice qué falló: sin esto un 400 no daba ninguna pista.
      if (status && status >= 400 && status < 500 && status !== 401) {
        console.log('[API] body:', JSON.stringify(error.response?.data));
      }
    }

    // 403 = autenticado pero sin permiso: no sirve refrescar, rechazamos directo.
    if (status === 403) {
      return Promise.reject(error);
    }

    // Solo manejamos 401 (token expirado/inválido).
    if (status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;
    const token = await refreshAccessToken();
    originalRequest.headers.Authorization = `Bearer ${token}`;
    return api(originalRequest);
  },
);

export default api;
