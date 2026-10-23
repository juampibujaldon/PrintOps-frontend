import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { API_BASE_URL } from '../src/constants/api';
import { clearSession, getAccessToken, getUser, setAccessToken } from '../src/services/storage';

vi.mock('@react-oauth/google', () => ({ googleLogout: vi.fn() }));

import { googleLogout } from '@react-oauth/google';
import { authService, googleErrorMessage } from '../src/services/authService';

const GOOGLE_URL = `${API_BASE_URL}/api/auth/google`;
const COMPLETE_URL = `${API_BASE_URL}/api/auth/google/complete`;
const authResponse = {
  accessToken: 'acc',
  refreshToken: 'ref',
  expiresIn: 900,
  user: { id: 1, email: 'a@b.com', role: 'MANAGER', workspaceId: 7 },
};

let mock: MockAdapter;
beforeEach(() => {
  vi.clearAllMocks();
  clearSession();
  mock = new MockAdapter(axios);
});
afterEach(() => mock.restore());

describe('loginWithGoogle', () => {
  it('200 -> authenticated, keeping the access token in memory (refresh token is a cookie)', async () => {
    mock.onPost(GOOGLE_URL).reply(200, authResponse);
    const result = await authService.loginWithGoogle('google-id-token', 'dev-1', true);
    expect(result).toEqual({ type: 'authenticated', auth: authResponse });
    expect(JSON.parse(mock.history.post[0].data)).toEqual({
      idToken: 'google-id-token',
      deviceId: 'dev-1',
      rememberMe: true,
    });
    expect(getAccessToken()).toBe('acc');
    expect(getUser()).toEqual(authResponse.user);
    // Nada de tokens en el storage del navegador.
    expect(Object.keys({ ...localStorage }).some((k) => k.includes('token'))).toBe(false);
    expect(Object.keys({ ...sessionStorage }).some((k) => k.includes('token'))).toBe(false);
  });

  it('202 -> onboarding, without persisting a session', async () => {
    mock.onPost(GOOGLE_URL).reply(202, { onboardingToken: 'ob', email: 'a@b.com', name: null });
    const result = await authService.loginWithGoogle('tok', 'dev-1', false);
    expect(result).toEqual({ type: 'onboarding', onboardingToken: 'ob', email: 'a@b.com', name: null });
    expect(getAccessToken()).toBeNull();
  });

  it.each([401, 403, 503])('%s -> rejects with the HTTP error', async (status) => {
    mock.onPost(GOOGLE_URL).reply(status);
    await expect(authService.loginWithGoogle('tok', 'dev-1', false)).rejects.toMatchObject({ response: { status } });
  });
});

describe('completeGoogleOnboarding', () => {
  it('sends the payload and persists the session', async () => {
    mock.onPost(COMPLETE_URL).reply(200, authResponse);
    const auth = await authService.completeGoogleOnboarding('ob', 'dev-1', false, { workspaceName: 'Mi taller' });
    expect(auth).toEqual(authResponse);
    expect(JSON.parse(mock.history.post[0].data)).toEqual({
      onboardingToken: 'ob',
      deviceId: 'dev-1',
      rememberMe: false,
      inviteToken: null,
      workspaceName: 'Mi taller',
    });
    expect(getAccessToken()).toBe('acc');
  });

  it('sends the invite token with null workspaceName', async () => {
    mock.onPost(COMPLETE_URL).reply(200, authResponse);
    await authService.completeGoogleOnboarding('ob', 'dev-1', true, { inviteToken: 'INV' });
    expect(JSON.parse(mock.history.post[0].data)).toMatchObject({ inviteToken: 'INV', workspaceName: null });
  });
});

describe('googleErrorMessage', () => {
  it.each([
    [401, 'Google'],
    [403, 'deshabilitada'],
    [503, 'no está disponible'],
  ])('maps %s', (status, fragment) => {
    expect(googleErrorMessage({ response: { status, data: {} } })).toContain(fragment);
  });
  it('prefers a backend message for other statuses', () => {
    expect(googleErrorMessage({ response: { status: 409, data: { message: 'Email ya registrado' } } })).toBe(
      'Email ya registrado',
    );
  });
  it('shows the lockout message when the IP is blocked (429)', () => {
    const message = 'IP bloqueada por múltiples intentos fallidos. Espere 15 minutos.';
    expect(googleErrorMessage({ response: { status: 429, data: { error: 'IP bloqueada', message } } })).toBe(message);
  });
});

describe('logout', () => {
  it('signs out of Google and clears the session (also when the remote call fails)', async () => {
    setAccessToken('acc');
    mock.onPost(/\/api\/auth\/logout/).reply(500);
    await expect(authService.logout('dev-1', 'tok')).rejects.toBeDefined();
    expect(googleLogout).toHaveBeenCalled();
    expect(getAccessToken()).toBeNull();
  });

  it('always sends keepSession=false (no soft logout on the web)', async () => {
    mock.onPost(/\/api\/auth\/logout/).reply(200);
    await authService.logout('dev-1', 'tok');
    expect(mock.history.post[0].url).toContain('keepSession=false');
  });
});
