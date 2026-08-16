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
        `[API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`,
        '| auth:', config.headers.Authorization ? 'Bearer ***' : 'NONE',
      );
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response interceptor: refresca el token ante 401 ──
let isRefreshing = false;
let failedQueue: Array<{ resolve: (value: string) => void; reject: (reason?: unknown) => void }> = [];

const processQueue = (error: unknown, token: string | null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token as string);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const status = error.response?.status;

    if (__DEV__) {
      console.log(`[API] response ${status} ${originalRequest?.method?.toUpperCase()} ${originalRequest?.url}`);
    }

    // 403 = autenticado pero sin permiso: no sirve refrescar, rechazamos directo.
    if (status === 403) {
      return Promise.reject(error);
    }

    // Solo manejamos 401 (token expirado/inválido).
    if (status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

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

      processQueue(null, data.accessToken);
      originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      // Solo limpiamos el access token local. BIOMETRICS_ENABLED y el Keychain
      // se limpian en authService si el refresh token está definitivamente inválido.
      await AsyncStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default api;
