// src/constants/api.ts
const envUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;

/**
 * Normaliza la URL del backend. Sin protocolo (p. ej. "mi-api.up.railway.app") el
 * navegador la trataría como una ruta relativa al propio front; se asume https,
 * salvo localhost / IPs, que en desarrollo van por http.
 */
export function normalizeApiBaseUrl(raw: string | undefined): string {
  let url = (raw ?? '').trim();
  if (!url) return 'http://localhost:8083';
  if (!/^https?:\/\//i.test(url)) {
    const isLocal = /^(localhost|127\.0\.0\.1|\d{1,3}(\.\d{1,3}){3})(:\d+)?(\/|$)/i.test(url);
    url = `${isLocal ? 'http' : 'https'}://${url.replace(/^\/+/, '')}`;
  }
  return url.replace(/\/+$/, '');
}

// La API se sirve en el MISMO origen que el front: en producción nginx hace proxy de /api y
// /ws al backend, y en desarrollo lo hace Vite (vite.config.ts). Es requisito para la cookie
// httpOnly del refresh token (SameSite=Strict). Por eso las URLs son relativas.
export const API_BASE_URL = '';

// Destino del proxy de Vite en desarrollo (VITE_API_BASE_URL, default localhost:8083).
export const DEV_API_TARGET: string = normalizeApiBaseUrl(envUrl);

// URL del WebSocket en el mismo host que la página (ws:// o wss:// según el protocolo).
export function wsUrl(): string {
  if (typeof window === 'undefined') return 'ws://localhost/ws';
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${window.location.host}/ws`;
}

export const STORAGE_KEYS = {
  DEVICE_ID: '@printops/device_id',
  THEME: '@printops/theme',
} as const;
