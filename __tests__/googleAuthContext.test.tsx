/* eslint-env jest */
import React from 'react';
import { act, renderHook } from '@testing-library/react-native';

jest.mock('../src/services/authService', () => ({
  authService: {
    restoreSession: jest.fn().mockResolvedValue(null),
    getOrCreateDeviceId: jest.fn().mockResolvedValue('dev-1'),
    loginWithGoogle: jest.fn(),
    completeGoogleOnboarding: jest.fn(),
  },
}));
jest.mock('../src/services/webSocketService', () => ({
  webSocketService: { connect: jest.fn(), disconnect: jest.fn() },
}));

import { AuthProvider, useAuthContext } from '../src/context/AuthContext';
import { authService } from '../src/services/authService';
import { webSocketService } from '../src/services/webSocketService';

const auth = {
  accessToken: 'acc', refreshToken: 'ref', expiresIn: 900,
  user: { id: 1, email: 'a@b.com', role: 'MANAGER', workspaceId: 7 },
};
const wrapper = ({ children }: { children: React.ReactNode }) => <AuthProvider>{children}</AuthProvider>;

async function setup() {
  const hook = renderHook(() => useAuthContext(), { wrapper });
  await act(async () => {});
  return hook;
}

beforeEach(() => jest.clearAllMocks());

describe('AuthContext google actions', () => {
  it('signInWithGoogle authenticates on a 200 result', async () => {
    (authService.loginWithGoogle as jest.Mock).mockResolvedValue({ type: 'authenticated', auth });
    const { result } = await setup();
    let res: any;
    await act(async () => { res = await result.current.signInWithGoogle(true); });
    expect(authService.loginWithGoogle).toHaveBeenCalledWith('dev-1', true);
    expect(res.type).toBe('authenticated');
    expect(result.current.state.isAuthenticated).toBe(true);
    expect(result.current.state.token).toBe('acc');
    expect(webSocketService.connect).toHaveBeenCalledWith(1);
  });

  it('signInWithGoogle returns onboarding without authenticating or toggling loading', async () => {
    const onboarding = { type: 'onboarding', onboardingToken: 'ob', email: 'a@b.com', name: null };
    (authService.loginWithGoogle as jest.Mock).mockResolvedValue(onboarding);
    const { result } = await setup();
    let res: any;
    await act(async () => { res = await result.current.signInWithGoogle(false); });
    expect(res).toEqual(onboarding);
    expect(result.current.state.isAuthenticated).toBe(false);
    // isLoading=true mostraría el Splash y desmontaría el Login.
    expect(result.current.state.isLoading).toBe(false);
  });

  it('completeGoogleOnboarding authenticates', async () => {
    (authService.completeGoogleOnboarding as jest.Mock).mockResolvedValue(auth);
    const { result } = await setup();
    await act(async () => {
      await result.current.completeGoogleOnboarding('ob', false, { workspaceName: 'T' });
    });
    expect(authService.completeGoogleOnboarding).toHaveBeenCalledWith('ob', 'dev-1', false, { workspaceName: 'T' });
    expect(result.current.state.isAuthenticated).toBe(true);
  });
});
