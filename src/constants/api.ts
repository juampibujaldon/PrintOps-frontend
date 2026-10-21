// src/constants/api.ts
const envUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;

export const API_BASE_URL: string = (envUrl && envUrl.trim() ? envUrl.trim() : 'http://localhost:8083').replace(/\/+$/, '');

export const STORAGE_KEYS = {
  ACCESS_TOKEN: '@printops/access_token',
  REFRESH_TOKEN: '@printops/refresh_token',
  DEVICE_ID: '@printops/device_id',
  USER: '@printops/user',
} as const;
