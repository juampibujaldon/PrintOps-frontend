// src/services/fcmService.ts
import {
  getMessaging,
  requestPermission,
  getToken,
  AuthorizationStatus,
} from '@react-native-firebase/messaging';
import api from './axiosInstance';
import { API_BASE_URL } from '../constants/api';

// Registra el token de Firebase Cloud Messaging del dispositivo en el backend
// (POST /api/auth/fcm-token). Si Firebase no está configurado en el proyecto
// nativo (sin pod install / GoogleService-Info.plist), falla silenciosamente y
// no rompe la app: solo se envían notificaciones in-app.
async function registerDeviceToken(): Promise<void> {
  try {
    const messaging = getMessaging();
    const authStatus = await requestPermission(messaging);
    const enabled =
      authStatus === AuthorizationStatus.AUTHORIZED ||
      authStatus === AuthorizationStatus.PROVISIONAL;
    if (!enabled) return;

    const token = await getToken(messaging);
    if (!token) return;

    await api.post(`${API_BASE_URL}/api/auth/fcm-token`, { token });
  } catch (e) {
    console.log('[FCM] registro de token omitido (Firebase no configurado):', e);
  }
}

export const fcmService = { registerDeviceToken };
