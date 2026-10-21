/* eslint-env jest */
import React from 'react';
import { Text } from 'react-native';
import { act, render } from '@testing-library/react-native';
import { ToastProvider, useToast } from '../src/context/ToastContext';
import { authReducer } from '../src/context/AuthContext';

jest.mock('../src/services/authService', () => ({ authService: {} }));
jest.mock('../src/services/webSocketService', () => ({ webSocketService: {} }));

describe('ToastProvider', () => {
  it('does not re-render consumers when a toast is shown', () => {
    jest.useFakeTimers();
    let renders = 0;
    let show: (m: string) => void = () => {};
    function Consumer() {
      renders += 1;
      show = useToast().showToast;
      return <Text>consumer</Text>;
    }
    render(<ToastProvider><Consumer /></ToastProvider>);
    const initial = renders;

    act(() => show('Guardado'));

    expect(renders).toBe(initial);
    jest.useRealTimers();
  });
});

describe('authReducer', () => {
  const state = {
    user: null, token: null, refreshToken: null, isLoading: true, isAuthenticated: false,
  };

  it('returns the same state for SET_LOADING with the current value', () => {
    expect(authReducer(state, { type: 'SET_LOADING', payload: true })).toBe(state);
  });

  it('still updates when SET_LOADING changes the value', () => {
    expect(authReducer(state, { type: 'SET_LOADING', payload: false })).toEqual({ ...state, isLoading: false });
  });
});
