/* eslint-env jest */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

const mockNavigate = jest.fn();
const mockSignIn = jest.fn();
const mockToast = jest.fn();
const mockConfigured = { value: true };

jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: mockNavigate }) }));
jest.mock('../src/hooks/useAuth', () => ({ useAuth: () => ({ signInWithGoogle: mockSignIn }) }));
jest.mock('../src/context/ToastContext', () => ({ useToast: () => ({ showToast: mockToast }) }));
jest.mock('../src/services/googleAuth', () => ({
  isGoogleSignInConfigured: () => mockConfigured.value,
  GoogleSignInError: class GoogleSignInError extends Error {},
}));

import GoogleSignInButton from '../src/components/auth/GoogleSignInButton';
import { GoogleSignInError } from '../src/services/googleAuth';

beforeEach(() => {
  jest.clearAllMocks();
  mockConfigured.value = true;
});

describe('GoogleSignInButton', () => {
  it('renders nothing when Google sign-in is not configured', () => {
    mockConfigured.value = false;
    const { queryByText } = render(<GoogleSignInButton />);
    expect(queryByText('Continuar con Google')).toBeNull();
  });

  it('renders when configured', () => {
    const { getByText } = render(<GoogleSignInButton />);
    expect(getByText('Continuar con Google')).toBeTruthy();
  });

  it('navigates to onboarding when the account does not exist', async () => {
    mockSignIn.mockResolvedValue({ type: 'onboarding', onboardingToken: 'ob', email: 'a@b.com', name: 'Ana' });
    const { getByText } = render(<GoogleSignInButton rememberMe />);
    fireEvent.press(getByText('Continuar con Google'));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('GoogleOnboarding', {
      onboardingToken: 'ob', email: 'a@b.com', name: 'Ana', rememberMe: true,
    }));
    expect(mockSignIn).toHaveBeenCalledWith(true);
  });

  it('is silent when the user cancels', async () => {
    mockSignIn.mockResolvedValue({ type: 'cancelled' });
    const { getByText } = render(<GoogleSignInButton />);
    fireEvent.press(getByText('Continuar con Google'));
    await waitFor(() => expect(mockSignIn).toHaveBeenCalled());
    expect(mockToast).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('shows a toast for Google errors', async () => {
    mockSignIn.mockRejectedValue(new GoogleSignInError('Google Play Services no está disponible'));
    const { getByText } = render(<GoogleSignInButton />);
    fireEvent.press(getByText('Continuar con Google'));
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith('Google Play Services no está disponible'));
  });

  it('shows a mapped toast for backend errors (503)', async () => {
    mockSignIn.mockRejectedValue({ response: { status: 503 } });
    const { getByText } = render(<GoogleSignInButton />);
    fireEvent.press(getByText('Continuar con Google'));
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith(expect.stringContaining('no está disponible')));
  });
});
