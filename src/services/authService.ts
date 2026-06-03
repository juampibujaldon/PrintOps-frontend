// src/services/authService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
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
    [STORAGE_KEYS.REFRESH_TOKEN, data.refreshToken],
    [STORAGE_KEYS.USER, JSON.stringify(data.user)],
  ]);

  return data;
}

async function logout(deviceId: string, token: string): Promise<void> {
  try {
    await axios.post(
      `${API_BASE_URL}/api/auth/logout?deviceId=${deviceId}`,
      {},
      { headers: { Authorization: `Bearer ${token}` } },
    );
  } finally {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.ACCESS_TOKEN,
      STORAGE_KEYS.REFRESH_TOKEN,
      STORAGE_KEYS.USER,
    ]);
  }
}

async function restoreSession(): Promise<AuthResponse | null> {
  const [token, refreshToken, userStr] = await Promise.all([
    AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN),
    AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN),
    AsyncStorage.getItem(STORAGE_KEYS.USER),
  ]);

  if (!token || !refreshToken || !userStr) return null;

  return {
    accessToken: token,
    refreshToken,
    expiresIn: 900,
    user: JSON.parse(userStr),
  };
}

async function register(email: string, password: string): Promise<void> {
  await axios.post(`${API_BASE_URL}/api/auth/register`, {
    email,
    password,
  });
}

export const authService = { login, logout, register, restoreSession, getOrCreateDeviceId };
