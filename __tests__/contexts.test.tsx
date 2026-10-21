import { act, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ToastProvider, useToast } from '../src/context/ToastContext';
import { authReducer } from '../src/context/AuthContext';

vi.mock('../src/services/authService', () => ({ authService: {} }));
vi.mock('../src/services/webSocketService', () => ({ webSocketService: {} }));

describe('ToastProvider', () => {
  it('does not re-render consumers when a toast is shown, and renders the message', () => {
    vi.useFakeTimers();
    let renders = 0;
    let show: (m: string) => void = () => {};
    function Consumer() {
      renders += 1;
      show = useToast().showToast;
      return <span>consumer</span>;
    }
    const { getByText, queryByText } = render(
      <ToastProvider>
        <Consumer />
      </ToastProvider>,
    );
    const initial = renders;

    act(() => show('Guardado'));

    expect(renders).toBe(initial);
    expect(getByText('Guardado')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(queryByText('Guardado')).toBeNull();
    vi.useRealTimers();
  });
});

describe('authReducer', () => {
  const state = {
    user: null,
    token: null,
    refreshToken: null,
    isLoading: true,
    isAuthenticated: false,
  };

  it('returns the same state for SET_LOADING with the current value', () => {
    expect(authReducer(state, { type: 'SET_LOADING', payload: true })).toBe(state);
  });

  it('still updates when SET_LOADING changes the value', () => {
    expect(authReducer(state, { type: 'SET_LOADING', payload: false })).toEqual({ ...state, isLoading: false });
  });

  it('LOGIN_SUCCESS authenticates and LOGOUT resets', () => {
    const user = { id: 1, email: 'a@b.com', role: 'MANAGER' as const, workspaceId: 1 };
    const logged = authReducer(state, { type: 'LOGIN_SUCCESS', payload: { user, token: 't', refreshToken: 'r' } });
    expect(logged).toMatchObject({ isAuthenticated: true, isLoading: false, token: 't', user });
    expect(authReducer(logged, { type: 'LOGOUT' })).toMatchObject({ isAuthenticated: false, user: null, isLoading: false });
  });

  it('RESTORE_TOKEN with null ends loading unauthenticated', () => {
    expect(authReducer(state, { type: 'RESTORE_TOKEN', payload: null })).toMatchObject({
      isAuthenticated: false,
      isLoading: false,
    });
  });
});
