// src/services/storage.ts
// Capa fina sobre localStorage/sessionStorage. Todo está envuelto en try/catch:
// el storage puede lanzar (modo privado, cuota, datos de sitio bloqueados).
// Los tokens NO se guardan acá (ver "Sesión"); solo deviceId, borradores y preferencias.
import { STORAGE_KEYS } from '../constants/api';
import type { AuthResponse, UserInfo } from '../types/auth';

type Store = Storage;

function local(): Store | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function session(): Store | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function read(store: Store | null, key: string): string | null {
  try {
    return store ? store.getItem(key) : null;
  } catch {
    return null;
  }
}

function write(store: Store | null, key: string, value: string): void {
  try {
    store?.setItem(key, value);
  } catch {
    // ignorado: sin storage la app sigue funcionando (sin persistencia)
  }
}

function erase(store: Store | null, key: string): void {
  try {
    store?.removeItem(key);
  } catch {
    // ignorado
  }
}

// ── Helpers genéricos (localStorage): borradores, preferencias de UI ──
export const storage = {
  getItem: (key: string): string | null => read(local(), key),
  setItem: (key: string, value: string): void => write(local(), key, value),
  removeItem: (key: string): void => erase(local(), key),
  getJSON<T>(key: string): T | null {
    const raw = read(local(), key);
    if (raw == null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },
  setJSON: (key: string, value: unknown): void => write(local(), key, JSON.stringify(value)),
};

// ── Sesión ──
// El refresh token vive en una cookie httpOnly que pone el backend (JavaScript no la puede
// leer: un XSS no se lleva la sesión). El access token (15 min) y el usuario quedan solo en
// memoria: al recargar la página se piden de nuevo con /api/auth/refresh.
let accessToken: string | null = null;
let currentUser: UserInfo | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string): void {
  accessToken = token;
}

export function removeAccessToken(): void {
  accessToken = null;
}

export function getUser(): UserInfo | null {
  return currentUser;
}

export function setSession(auth: AuthResponse): void {
  accessToken = auth.accessToken;
  if (auth.user) currentUser = auth.user;
}

export function clearSession(): void {
  accessToken = null;
  currentUser = null;
}

function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

let memoryDeviceId: string | null = null;

export function getOrCreateDeviceId(): string {
  let id = read(local(), STORAGE_KEYS.DEVICE_ID) ?? memoryDeviceId;
  if (!id) {
    id = generateUuid();
    write(local(), STORAGE_KEYS.DEVICE_ID, id);
  }
  memoryDeviceId = id;
  return id;
}

// Limpia restos de versiones anteriores que guardaban los tokens en el navegador.
export function purgeLegacyTokens(): void {
  for (const key of ['@printops/access_token', '@printops/refresh_token', '@printops/user']) {
    erase(local(), key);
    erase(session(), key);
  }
}
