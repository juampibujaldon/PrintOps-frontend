/* eslint-env jest */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

const mockComplete = jest.fn();
const mockToast = jest.fn();
jest.mock('../src/hooks/useAuth', () => ({ useAuth: () => ({ completeGoogleOnboarding: mockComplete }) }));
jest.mock('../src/context/ToastContext', () => ({ useToast: () => ({ showToast: mockToast }) }));

import GoogleOnboardingScreen from '../src/screens/GoogleOnboardingScreen';

const navigation: any = { navigate: jest.fn(), replace: jest.fn() };
const route: any = { params: { onboardingToken: 'ob', email: 'ana@taller.com', name: 'Ana', rememberMe: true } };
const renderScreen = () => render(<GoogleOnboardingScreen navigation={navigation} route={route} />);

beforeEach(() => {
  jest.clearAllMocks();
  mockComplete.mockResolvedValue(undefined);
});

describe('GoogleOnboardingScreen', () => {
  it('shows the Google email and the default workspace placeholder', () => {
    const { getByText, getByPlaceholderText } = renderScreen();
    expect(getByText('ana@taller.com')).toBeTruthy();
    expect(getByPlaceholderText('Taller de ana@taller.com')).toBeTruthy();
  });

  it('creates a workspace with the typed name', async () => {
    const { getByPlaceholderText, getByText } = renderScreen();
    fireEvent.changeText(getByPlaceholderText('Taller de ana@taller.com'), '  Mi Taller ');
    fireEvent.press(getByText('Continuar'));
    await waitFor(() => expect(mockComplete).toHaveBeenCalledWith('ob', true, { workspaceName: 'Mi Taller' }));
  });

  it('falls back to the default workspace name when left empty', async () => {
    const { getByText } = renderScreen();
    fireEvent.press(getByText('Continuar'));
    await waitFor(() => expect(mockComplete).toHaveBeenCalledWith('ob', true, { workspaceName: 'Taller de ana@taller.com' }));
  });

  it('requires an invite code in invite mode and does not call the API without it', async () => {
    const { getByText, findByText } = renderScreen();
    fireEvent.press(getByText('Unirme con un código de invitación'));
    fireEvent.press(getByText('Continuar'));
    expect(await findByText('Ingresá el código de invitación')).toBeTruthy();
    expect(mockComplete).not.toHaveBeenCalled();
  });

  it('joins with the invite code', async () => {
    const { getByText, getByPlaceholderText } = renderScreen();
    fireEvent.press(getByText('Unirme con un código de invitación'));
    fireEvent.changeText(getByPlaceholderText('Código enviado por el manager'), ' INV123 ');
    fireEvent.press(getByText('Continuar'));
    await waitFor(() => expect(mockComplete).toHaveBeenCalledWith('ob', true, { inviteToken: 'INV123' }));
  });

  it('401 (onboarding expired) goes back to Login with a toast', async () => {
    mockComplete.mockRejectedValue({ response: { status: 401, data: {} } });
    const { getByText } = renderScreen();
    fireEvent.press(getByText('Continuar'));
    await waitFor(() => expect(navigation.navigate).toHaveBeenCalledWith('Login'));
    expect(mockToast).toHaveBeenCalledWith(expect.stringContaining('venció'));
  });

  it('409 (email already registered) goes back to Login with a toast', async () => {
    mockComplete.mockRejectedValue({ response: { status: 409, data: { message: 'Ese email ya está registrado' } } });
    const { getByText } = renderScreen();
    fireEvent.press(getByText('Continuar'));
    await waitFor(() => expect(navigation.navigate).toHaveBeenCalledWith('Login'));
    expect(mockToast).toHaveBeenCalledWith('Ese email ya está registrado');
  });

  it('INVITE_* errors open the InviteError screen', async () => {
    mockComplete.mockRejectedValue({ response: { status: 400, data: { code: 'INVITE_EXPIRED', message: 'Vencida' } } });
    const { getByText, getByPlaceholderText } = renderScreen();
    fireEvent.press(getByText('Unirme con un código de invitación'));
    fireEvent.changeText(getByPlaceholderText('Código enviado por el manager'), 'X');
    fireEvent.press(getByText('Continuar'));
    await waitFor(() => expect(navigation.navigate).toHaveBeenCalledWith('InviteError', {
      code: 'INVITE_EXPIRED', email: 'ana@taller.com', message: 'Vencida',
    }));
  });
});
