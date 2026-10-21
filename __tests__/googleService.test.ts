/* eslint-env jest */
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import { API_BASE_URL, STORAGE_KEYS } from '../src/constants/api';

jest.mock('../src/services/googleAuth', () => ({
  getGoogleIdToken: jest.fn(),
  signOutFromGoogle: jest.fn().mockResolvedValue(undefined),
  GoogleSignInError: class extends Error {},
}));

import { authService, googleErrorMessage } from '../src/services/authService';
import { getGoogleIdToken, signOutFromGoogle } from '../src/services/googleAuth';

const GOOGLE_URL = `${API_BASE_URL}/api/auth/google`;
const COMPLETE_URL = `${API_BASE_URL}/api/auth/google/complete`;
const authResponse = {
  accessToken: 'acc', refreshToken: 'ref', expiresIn: 900,
  user: { id: 1, email: 'a@b.com', role: 'MANAGER', workspaceId: 7 },
};

let mock: MockAdapter;
beforeEach(async () => {
  jest.clearAllMocks();
  mock = new MockAdapter(axios);
  await AsyncStorage.clear();
  (getGoogleIdToken as jest.Mock).mockResolvedValue('google-id-token');
});
afterEach(() => mock.restore());

describe('loginWithGoogle', () => {
  it('200 -> authenticated, persisting tokens like the password login', async () => {
    mock.onPost(GOOGLE_URL).reply(200, authResponse);
    const result = await authService.loginWithGoogle('dev-1', true);
    expect(result).toEqual({ type: 'authenticated', auth: authResponse });
    expect(JSON.parse(mock.history.post[0].data)).toEqual({
      idToken: 'google-id-token', deviceId: 'dev-1', rememberMe: true,
    });
    expect(await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)).toBe('acc');
    expect(Keychain.setGenericPassword).toHaveBeenCalledWith('refreshToken', 'ref', { service: 'refreshTokenService' });
  });

  it('202 -> onboarding, without persisting a session', async () => {
    mock.onPost(GOOGLE_URL).reply(202, { onboardingToken: 'ob', email: 'a@b.com', name: null });
    const result = await authService.loginWithGoogle('dev-1', false);
    expect(result).toEqual({ type: 'onboarding', onboardingToken: 'ob', email: 'a@b.com', name: null });
    expect(await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)).toBeNull();
  });

  it.each([401, 403, 503])('%s -> rejects with the HTTP error', async (status) => {
    mock.onPost(GOOGLE_URL).reply(status);
    await expect(authService.loginWithGoogle('dev-1', false)).rejects.toMatchObject({ response: { status } });
  });

  it('user cancel -> cancelled, no request made', async () => {
    (getGoogleIdToken as jest.Mock).mockResolvedValue(null);
    await expect(authService.loginWithGoogle('dev-1', false)).resolves.toEqual({ type: 'cancelled' });
    expect(mock.history.post).toHaveLength(0);
  });
});

describe('completeGoogleOnboarding', () => {
  it('sends the payload and persists the session', async () => {
    mock.onPost(COMPLETE_URL).reply(200, authResponse);
    const auth = await authService.completeGoogleOnboarding('ob', 'dev-1', false, { workspaceName: 'Mi taller' });
    expect(auth).toEqual(authResponse);
    expect(JSON.parse(mock.history.post[0].data)).toEqual({
      onboardingToken: 'ob', deviceId: 'dev-1', rememberMe: false, inviteToken: null, workspaceName: 'Mi taller',
    });
    expect(await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)).toBe('acc');
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
    expect(googleErrorMessage({ response: { status: 409, data: { message: 'Email ya registrado' } } })).toBe('Email ya registrado');
  });
  it('shows the lockout message when the IP is blocked (429)', () => {
    const message = 'IP bloqueada por múltiples intentos fallidos. Espere 15 minutos.';
    expect(googleErrorMessage({ response: { status: 429, data: { error: 'IP bloqueada', message } } })).toBe(message);
  });
});

describe('logout', () => {
  it('signs out of Google (also when the remote call fails)', async () => {
    mock.onPost(/\/api\/auth\/logout/).reply(500);
    await expect(authService.logout('dev-1', 'tok')).rejects.toBeDefined();
    expect(signOutFromGoogle).toHaveBeenCalled();
  });
});
