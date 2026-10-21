// src/services/storage.ts
// Capa fina sobre localStorage/sessionStorage. Todo está envuelto en try/catch:
// el storage puede lanzar (modo privado, cuota, datos de sitio bloqueados).
//
// Sesión: rememberMe=true -> localStorage; false -> sessionStorage (muere al cerrar
// la pestaña/navegador). deviceId siempre en localStorage.
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
// El storage "activo" es el que ya contiene datos de sesión (sessionStorage tiene prioridad);
// si no hay ninguno, localStorage.
function activeStore(): Store | null {
  const s = session();
  const l = local();
  for (const key of [STORAGE_KEYS.REFRESH_TOKEN, STORAGE_KEYS.ACCESS_TOKEN, STORAGE_KEYS.USER]) {
    if (read(s, key) != null) return s;
  }
  for (const key of [STORAGE_KEYS.REFRESH_TOKEN, STORAGE_KEYS.ACCESS_TOKEN, STORAGE_KEYS.USER]) {
    if (read(l, key) != null) return l;
  }
  return l;
}

function readSession(key: string): string | null {
  return read(session(), key) ?? read(local(), key);
}

export function getAccessToken(): string | null {
  return readSession(STORAGE_KEYS.ACCESS_TOKEN);
}

export function setAccessToken(token: string): void {
  write(activeStore(), STORAGE_KEYS.ACCESS_TOKEN, token);
}

export function removeAccessToken(): void {
  erase(session(), STORAGE_KEYS.ACCESS_TOKEN);
  erase(local(), STORAGE_KEYS.ACCESS_TOKEN);
}

export function getRefreshToken(): string | null {
  return readSession(STORAGE_KEYS.REFRESH_TOKEN);
}

export function setRefreshToken(token: string): void {
  write(activeStore(), STORAGE_KEYS.REFRESH_TOKEN, token);
}

export function getUser(): UserInfo | null {
  const raw = readSession(STORAGE_KEYS.USER);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserInfo;
  } catch {
    return null;
  }
}

export function setUser(user: UserInfo): void {
  write(activeStore(), STORAGE_KEYS.USER, JSON.stringify(user));
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

/** Guarda una sesión nueva (login). rememberMe decide localStorage vs sessionStorage. */
export function saveSession(auth: AuthResponse, rememberMe: boolean): void {
  clearSession();
  const store = rememberMe ? local() : session();
  write(store, STORAGE_KEYS.ACCESS_TOKEN, auth.accessToken);
  write(store, STORAGE_KEYS.REFRESH_TOKEN, auth.refreshToken);
  write(store, STORAGE_KEYS.USER, JSON.stringify(auth.user));
}

/** Actualiza tokens/usuario (refresh) en el mismo storage donde ya vive la sesión. */
export function updateSession(auth: AuthResponse): void {
  const store = activeStore();
  write(store, STORAGE_KEYS.ACCESS_TOKEN, auth.accessToken);
  if (auth.refreshToken) write(store, STORAGE_KEYS.REFRESH_TOKEN, auth.refreshToken);
  if (auth.user) write(store, STORAGE_KEYS.USER, JSON.stringify(auth.user));
}

/** Borra tokens y usuario (no el deviceId). */
export function clearSession(): void {
  for (const key of [STORAGE_KEYS.ACCESS_TOKEN, STORAGE_KEYS.REFRESH_TOKEN, STORAGE_KEYS.USER]) {
    erase(session(), key);
    erase(local(), key);
  }
}
