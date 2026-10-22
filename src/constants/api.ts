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

export const API_BASE_URL: string = normalizeApiBaseUrl(envUrl);

export const STORAGE_KEYS = {
  ACCESS_TOKEN: '@printops/access_token',
  REFRESH_TOKEN: '@printops/refresh_token',
  DEVICE_ID: '@printops/device_id',
  USER: '@printops/user',
} as const;
