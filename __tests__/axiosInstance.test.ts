/* eslint-env jest */
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import api from '../src/services/axiosInstance';
import { API_BASE_URL, STORAGE_KEYS } from '../src/constants/api';

const REFRESH_URL = `${API_BASE_URL}/api/auth/refresh`;
const DATA_URL = `${API_BASE_URL}/api/data`;
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

let apiMock: MockAdapter;
let authMock: MockAdapter;
let refreshCalls: number;

beforeEach(async () => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  await AsyncStorage.clear();
  await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, 'old');
  await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_ID, 'device-1');
  (Keychain.getGenericPassword as jest.Mock).mockResolvedValue({ password: 'refresh-1' });

  refreshCalls = 0;
  authMock = new MockAdapter(axios);
  authMock.onPost(REFRESH_URL).reply(async () => {
    refreshCalls += 1;
    await delay(20);
    return [200, { accessToken: 'new', refreshToken: 'refresh-2' }];
  });

  apiMock = new MockAdapter(api, { delayResponse: 0 });
});

afterEach(() => {
  apiMock.restore();
  authMock.restore();
  jest.restoreAllMocks();
});

// El backend acepta solo el token 'new'. `latencyMs` simula respuestas que llegan en momentos distintos.
const serverAcceptingNewToken = (latencyByCall: number[]) => {
  let call = 0;
  apiMock.onGet(DATA_URL).reply(async config => {
    await delay(latencyByCall[call++] ?? 0);
    return config.headers?.Authorization === 'Bearer new' ? [200, 'ok'] : [401];
  });
};

describe('401 handling', () => {
  it('refreshes once for two concurrent 401s', async () => {
    serverAcceptingNewToken([5, 5]);
    const [a, b] = await Promise.all([api.get(DATA_URL), api.get(DATA_URL)]);
    expect([a.data, b.data]).toEqual(['ok', 'ok']);
    expect(refreshCalls).toBe(1);
  });

  it('refreshes once when a second 401 arrives right after the refresh finished', async () => {
    // Ambas salen con el token viejo; la segunda recibe su 401 cuando el refresh ya terminó.
    serverAcceptingNewToken([5, 120]);
    const [a, b] = await Promise.all([api.get(DATA_URL), api.get(DATA_URL)]);
    expect([a.data, b.data]).toEqual(['ok', 'ok']);
    expect(refreshCalls).toBe(1);
  });

  it('still refreshes when the stored token is the one that failed', async () => {
    serverAcceptingNewToken([0]);
    const res = await api.get(DATA_URL);
    expect(res.data).toBe('ok');
    expect(refreshCalls).toBe(1);
  });
});

describe('multipart uploads', () => {
  const captureTimeout = async (data?: unknown, timeout?: number) => {
    let seen: number | undefined;
    apiMock.onPost(`${API_BASE_URL}/api/upload`).reply(config => {
      seen = config.timeout;
      return [200, {}];
    });
    await api.post(`${API_BASE_URL}/api/upload`, data, timeout ? { timeout } : undefined);
    return seen;
  };

  it('gives FormData requests a 60s timeout', async () => {
    const form = new FormData();
    form.append('photo', 'x');
    expect(await captureTimeout(form)).toBe(60000);
  });

  it('keeps the default timeout for JSON requests', async () => {
    expect(await captureTimeout({ a: 1 })).toBe(15000);
  });

  it('never shortens a longer per-call timeout', async () => {
    const form = new FormData();
    form.append('photo', 'x');
    expect(await captureTimeout(form, 120000)).toBe(120000);
  });
});
