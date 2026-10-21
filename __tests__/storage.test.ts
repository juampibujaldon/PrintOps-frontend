import { describe, expect, it } from 'vitest';
import { STORAGE_KEYS } from '../src/constants/api';
import {
  clearSession,
  getAccessToken,
  getOrCreateDeviceId,
  getRefreshToken,
  getUser,
  saveSession,
  setAccessToken,
  storage,
  updateSession,
} from '../src/services/storage';

const auth = {
  accessToken: 'a1',
  refreshToken: 'r1',
  expiresIn: 900,
  user: { id: 5, email: 'x@y.com', role: 'TECNICO' as const, workspaceId: 2 },
};

describe('session storage', () => {
  it('rememberMe=true persists in localStorage', () => {
    saveSession(auth, true);
    expect(localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)).toBe('r1');
    expect(sessionStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)).toBeNull();
    expect(getAccessToken()).toBe('a1');
    expect(getUser()).toEqual(auth.user);
  });

  it('rememberMe=false uses sessionStorage and token rotation stays there', () => {
    saveSession(auth, false);
    expect(sessionStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)).toBe('a1');
    expect(localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)).toBeNull();
    updateSession({ ...auth, accessToken: 'a2', refreshToken: 'r2' });
    expect(sessionStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)).toBe('a2');
    expect(localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)).toBeNull();
    setAccessToken('a3');
    expect(getAccessToken()).toBe('a3');
    expect(getRefreshToken()).toBe('r2');
  });

  it('clearSession removes tokens and user but keeps the deviceId', () => {
    const id = getOrCreateDeviceId();
    saveSession(auth, true);
    clearSession();
    expect(getAccessToken()).toBeNull();
    expect(getUser()).toBeNull();
    expect(getOrCreateDeviceId()).toBe(id);
  });
});

describe('deviceId', () => {
  it('is generated once and reused', () => {
    const a = getOrCreateDeviceId();
    expect(a).toMatch(/^[0-9a-f-]{36}$/);
    expect(getOrCreateDeviceId()).toBe(a);
  });
});

describe('generic helpers', () => {
  it('round-trips JSON and tolerates corrupt values', () => {
    storage.setJSON('k', { a: 1 });
    expect(storage.getJSON('k')).toEqual({ a: 1 });
    storage.setItem('bad', '{oops');
    expect(storage.getJSON('bad')).toBeNull();
  });
});
