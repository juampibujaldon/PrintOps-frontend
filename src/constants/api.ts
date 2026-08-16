// src/constants/api.ts
import { Platform } from 'react-native';

export const API_BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:8083' : 'http://localhost:8083';

export const STORAGE_KEYS = {
  ACCESS_TOKEN: '@printops/access_token',
  REFRESH_TOKEN: '@printops/refresh_token',
  DEVICE_ID: '@printops/device_id',
  USER: '@printops/user',
} as const;
