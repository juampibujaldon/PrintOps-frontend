// src/context/AuthContext.tsx
import React, { createContext, useContext, useReducer, useEffect, useMemo } from 'react';
import { authService } from '../services/authService';
import { webSocketService } from '../services/webSocketService';
import { setOnSessionExpired } from '../services/axiosInstance';
import { AuthAction, AuthState } from '../types/auth';

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
  register: (email: string, password: string, inviteToken?: string, workspaceName?: string) => Promise<string>;
  logout: () => Promise<void>;
  restore: (skipBiometrics?: boolean) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Restaurar sesión al iniciar
  useEffect(() => {
    authService.restoreSession()
      .then((session) => {
        setTimeout(() => {
          dispatch({ type: 'RESTORE_TOKEN', payload: session
            ? { user: session.user, token: session.accessToken, refreshToken: session.refreshToken }
            : null });
          if (session) webSocketService.connect(session.user.id);
        }, 1000); // Pequeño delay para que se aprecie el SplashScreen
      })
      .catch(() => {
        // Si la restauración falla (ej. refresh token expirado), ir al login
        // en lugar de quedarse colgado en el Splash.
        dispatch({ type: 'RESTORE_TOKEN', payload: null });
      });
  }, []);

  // Si el interceptor no puede renovar el token, se vuelve al login.
  useEffect(() => {
    setOnSessionExpired(() => {
      webSocketService.disconnect();
      dispatch({ type: 'LOGOUT' });
    });
    return () => setOnSessionExpired(null);
  }, []);

  const login = async (email: string, password: string, rememberMe: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const data = await authService.login(email, password, rememberMe);
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user: data.user, token: data.accessToken, refreshToken: data.refreshToken },
      });
      webSocketService.connect(data.user.id);
    } catch (error) {
      // Si el login falla, no dejamos la app clavada en el Splash.
      dispatch({ type: 'SET_LOADING', payload: false });
      throw error;
    }
  };

  const register = async (
    email: string,
    password: string,
    inviteToken?: string,
    workspaceName?: string,
  ): Promise<string> => {
    // Sin auto-login: el usuario debe verificar su email antes de iniciar sesión.
    return await authService.register(email, password, inviteToken, workspaceName);
  };

  const logout = async () => {
    try {
      const deviceId = await authService.getOrCreateDeviceId();
      if (state.token) {
        await authService.logout(deviceId, state.token);
      }
    } catch {
      // Falla remota (red/401): igual cerramos la sesión local.
    } finally {
      webSocketService.disconnect();
      // Siempre limpiamos el estado local, aunque la llamada remota falle.
      dispatch({ type: 'LOGOUT' });
    }
  };

  const restore = async (skipBiometrics = false) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const session = await authService.restoreSession(skipBiometrics);
      if (session) {
        dispatch({ type: 'RESTORE_TOKEN', payload: { user: session.user, token: session.accessToken, refreshToken: session.refreshToken } });
        webSocketService.connect(session.user.id);
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
