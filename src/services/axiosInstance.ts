// src/services/axiosInstance.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '../constants/api';
import {
  getAccessToken,
  getOrCreateDeviceId,
  getRefreshToken,
  removeAccessToken,
  setAccessToken,
  setRefreshToken,
} from './storage';

const isDev = import.meta.env.DEV && import.meta.env.MODE !== 'test';

const DEFAULT_TIMEOUT_MS = 15000;
// Subir fotos por una red móvil lenta tarda mucho más que un request JSON.
const UPLOAD_TIMEOUT_MS = 60000;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: DEFAULT_TIMEOUT_MS,
  // No fijamos Content-Type por defecto: axios lo genera solo
  // (application/json para objetos y multipart/form-data con boundary para FormData).
});

// ── Request interceptor: adjunta el Bearer token y loguea el request ──
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (config.data instanceof FormData) {
      config.timeout = Math.max(config.timeout ?? 0, UPLOAD_TIMEOUT_MS);
    }

    if (isDev) {
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
  type FieldError = { field?: string; message: string };
  const lines = (data as FieldError[])
    .filter((e) => e && typeof e.message === 'string')
    .map((e) => {
      const label = e.field ? FIELD_LABELS[e.field] : undefined;
      // "marginPercent no puede superar 100" → "Margen (%): no puede superar 100"
      return label ? `${label}: ${e.message.replace(new RegExp(`^${e.field}\\s*`), '')}` : e.message;
    });
  if (lines.length > 0) {
    if (error.response) error.response.data = { error: 'Datos inválidos', message: lines.join('\n'), fields: data };
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

// Varias pestañas comparten localStorage y el refresh token rota en cada uso: si dos pestañas
// refrescan a la vez, la segunda mandaría un token ya rotado y cerraría la sesión. El lock
// serializa el refresh entre pestañas; si al obtenerlo el refresh token ya cambió, otra pestaña
// refrescó y se reutiliza su access token.
function doRefresh(): Promise<string> {
  const tokenBefore = getRefreshToken();
  if (typeof navigator === 'undefined' || !navigator.locks) {
    return refreshWithServer();
  }
  return navigator.locks.request('printops-token-refresh', async () => {
    const current = getRefreshToken();
    const accessToken = getAccessToken();
    if (current && current !== tokenBefore && accessToken) {
      return accessToken;
    }
    return refreshWithServer();
  });
}

async function refreshWithServer(): Promise<string> {
  try {
    const refreshToken = getRefreshToken();
    const deviceId = getOrCreateDeviceId();

    if (!refreshToken || !deviceId) {
      throw new Error('No hay refresh token');
    }

    const { data } = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
      refreshToken,
      deviceId,
    });

    setAccessToken(data.accessToken);
    if (data.refreshToken) {
      setRefreshToken(data.refreshToken);
    }
    return data.accessToken;
  } catch (refreshError) {
    // Solo limpiamos el access token local; el resto de la sesión se limpia en
    // AuthContext (onSessionExpired) si el refresh token está definitivamente inválido.
    removeAccessToken();
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

    if (isDev) {
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
    // Si otra request ya renovó el token mientras esta estaba en vuelo, alcanza con
    // reintentar con el token vigente: un segundo refresh gastaría el refresh token rotado.
    const sentAuthorization = originalRequest.headers?.Authorization;
    const storedToken = getAccessToken();
    const token = storedToken && `Bearer ${storedToken}` !== sentAuthorization
      ? storedToken
      : await refreshAccessToken();
    originalRequest.headers.Authorization = `Bearer ${token}`;
    return api(originalRequest);
  },
);

export default api;
