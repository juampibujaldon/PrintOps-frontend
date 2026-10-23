import { describe, expect, it } from 'vitest';
import {
  clearSession,
  getAccessToken,
  getOrCreateDeviceId,
  getUser,
  purgeLegacyTokens,
  setAccessToken,
  setSession,
  storage,
} from '../src/services/storage';

const auth = {
  accessToken: 'a1',
  expiresIn: 900,
  user: { id: 5, email: 'x@y.com', role: 'TECNICO' as const, workspaceId: 2 },
};

describe('session (en memoria)', () => {
  it('keeps the access token and user in memory, never in browser storage', () => {
    setSession(auth);
    expect(getAccessToken()).toBe('a1');
    expect(getUser()).toEqual(auth.user);
    expect(JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage })).not.toContain('a1');
    setAccessToken('a2');
    expect(getAccessToken()).toBe('a2');
  });

  it('clearSession removes token and user but keeps the deviceId', () => {
    const id = getOrCreateDeviceId();
    setSession(auth);
    clearSession();
    expect(getAccessToken()).toBeNull();
    expect(getUser()).toBeNull();
    expect(getOrCreateDeviceId()).toBe(id);
  });

  it('purges tokens left by older versions', () => {
    localStorage.setItem('@printops/refresh_token', 'viejo');
    sessionStorage.setItem('@printops/access_token', 'viejo');
    purgeLegacyTokens();
    expect(localStorage.getItem('@printops/refresh_token')).toBeNull();
    expect(sessionStorage.getItem('@printops/access_token')).toBeNull();
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
