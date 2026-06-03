// src/context/AuthContext.tsx
import React, { createContext, useContext, useReducer, useEffect, useMemo } from 'react';
import { authService } from '../services/authService';
import { AuthAction, AuthState, UserInfo } from '../types/auth';

const initialState: AuthState = {
  user: null,
  token: null,
  refreshToken: null,
  isLoading: true,
  isAuthenticated: false,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'RESTORE_TOKEN':
      if (!action.payload) {
        return { ...initialState, isLoading: false };
      }
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        refreshToken: action.payload.refreshToken,
        isAuthenticated: true,
        isLoading: false,
      };

    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        refreshToken: action.payload.refreshToken,
        isAuthenticated: true,
        isLoading: false,
      };

    case 'LOGOUT':
      return { ...initialState, isLoading: false };

    default:
      return state;
  }
}

interface AuthContextValue {
  state: AuthState;
  login: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  restore: (skipBiometrics?: boolean) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Restaurar sesión al iniciar
  useEffect(() => {
    authService.restoreSession().then((session) => {
      setTimeout(() => {
        dispatch({ type: 'RESTORE_TOKEN', payload: session
          ? { user: session.user, token: session.accessToken, refreshToken: session.refreshToken }
          : null });
      }, 1000); // Pequeño delay para que se aprecie el SplashScreen
    });
  }, []);

  const login = async (email: string, password: string, rememberMe: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    const data = await authService.login(email, password, rememberMe);
    dispatch({
      type: 'LOGIN_SUCCESS',
      payload: { user: data.user, token: data.accessToken, refreshToken: data.refreshToken },
    });
  };

  const register = async (email: string, password: string) => {
    await authService.register(email, password);
    // Auto-login after successful registration
    await login(email, password, true);
  };

  const logout = async () => {
    const deviceId = await authService.getOrCreateDeviceId();
    if (state.token) {
      await authService.logout(deviceId, state.token);
    }
    dispatch({ type: 'LOGOUT' });
  };

  const restore = async (skipBiometrics = false) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const session = await authService.restoreSession(skipBiometrics);
      if (session) {
        dispatch({ type: 'RESTORE_TOKEN', payload: { user: session.user, token: session.accessToken, refreshToken: session.refreshToken } });
        return true;
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
        return false;
      }
    } catch (error: any) {
      dispatch({ type: 'SET_LOADING', payload: false });
      throw error;
    }
  };

  const value = useMemo(() => ({ state, login, register, logout, restore }), [state]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext debe usarse dentro de AuthProvider');
  return ctx;
}
