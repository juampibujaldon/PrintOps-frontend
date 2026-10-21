/* eslint-env jest */
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
  },
  statusCodes: {
    SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
    IN_PROGRESS: 'IN_PROGRESS',
    PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
  },
}));
jest.mock('../src/constants/google', () => {
  const state = { web: 'web-id.apps.googleusercontent.com', ios: 'ios-id' };
  return {
    __state: state,
    get GOOGLE_WEB_CLIENT_ID() { return state.web; },
    get GOOGLE_IOS_CLIENT_ID() { return state.ios; },
  };
});

import {
  configureGoogleSignIn, isGoogleSignInConfigured, getGoogleIdToken, signOutFromGoogle, GoogleSignInError,
} from '../src/services/googleAuth';

const mockGoogle = (jest.requireMock('@react-native-google-signin/google-signin') as any).GoogleSignin;
const mockConst = (jest.requireMock('../src/constants/google') as any).__state;

const platform = (jest.requireActual('react-native') as any).Platform;
const originalOS = platform.OS;

beforeEach(() => {
  jest.clearAllMocks();
  mockConst.web = 'web-id.apps.googleusercontent.com';
  mockConst.ios = 'ios-id';
  platform.OS = 'android';
  mockGoogle.hasPlayServices.mockResolvedValue(true);
});

afterAll(() => {
  platform.OS = originalOS;
});

describe('googleAuth', () => {
  it('is configured only when the web client id is set', () => {
    expect(isGoogleSignInConfigured()).toBe(true);
    mockConst.web = '';
    expect(isGoogleSignInConfigured()).toBe(false);
  });

  it('on iOS also requires the iOS client id (the native configure rejects without it)', () => {
    platform.OS = 'ios';
    expect(isGoogleSignInConfigured()).toBe(true);
    mockConst.ios = '';
    expect(isGoogleSignInConfigured()).toBe(false);
    configureGoogleSignIn();
    expect(mockGoogle.configure).not.toHaveBeenCalled();
  });

  it('on Android the iOS client id is not needed', () => {
    mockConst.ios = '';
    expect(isGoogleSignInConfigured()).toBe(true);
  });

  it('configures with webClientId and iosClientId, and skips when not configured', () => {
    configureGoogleSignIn();
    expect(mockGoogle.configure).toHaveBeenCalledWith({
      webClientId: 'web-id.apps.googleusercontent.com', iosClientId: 'ios-id',
    });
    mockGoogle.configure.mockClear();
    mockConst.web = '';
    configureGoogleSignIn();
    expect(mockGoogle.configure).not.toHaveBeenCalled();
  });

  it('returns the idToken on success', async () => {
    mockGoogle.signIn.mockResolvedValue({ type: 'success', data: { idToken: 'tok' } });
    await expect(getGoogleIdToken()).resolves.toBe('tok');
  });

  it('returns null silently when the user cancels (result type)', async () => {
    mockGoogle.signIn.mockResolvedValue({ type: 'cancelled', data: null });
    await expect(getGoogleIdToken()).resolves.toBeNull();
  });

  it('returns null silently when the user cancels (thrown code)', async () => {
    mockGoogle.signIn.mockRejectedValue({ code: 'SIGN_IN_CANCELLED' });
    await expect(getGoogleIdToken()).resolves.toBeNull();
  });

  it('maps IN_PROGRESS to a silent null', async () => {
    mockGoogle.signIn.mockRejectedValue({ code: 'IN_PROGRESS' });
    await expect(getGoogleIdToken()).resolves.toBeNull();
  });

  it('throws a GoogleSignInError with a message when Play Services are unavailable', async () => {
    mockGoogle.hasPlayServices.mockRejectedValue({ code: 'PLAY_SERVICES_NOT_AVAILABLE' });
    await expect(getGoogleIdToken()).rejects.toBeInstanceOf(GoogleSignInError);
    await expect(getGoogleIdToken()).rejects.toMatchObject({ message: expect.stringContaining('Google Play') });
  });

  it('throws a generic error when there is no idToken', async () => {
    mockGoogle.signIn.mockResolvedValue({ type: 'success', data: { idToken: null } });
    await expect(getGoogleIdToken()).rejects.toBeInstanceOf(GoogleSignInError);
  });

  it('signOutFromGoogle ignores errors', async () => {
    mockGoogle.signOut.mockRejectedValue(new Error('boom'));
    await expect(signOutFromGoogle()).resolves.toBeUndefined();
    expect(mockGoogle.signOut).toHaveBeenCalled();
  });
});
