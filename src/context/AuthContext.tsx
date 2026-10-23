// src/context/AuthContext.tsx
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';
import type { ReactNode } from 'react';
import { authService } from '../services/authService';
import type { GoogleLoginResult } from '../services/authService';
import { webSocketService } from '../services/webSocketService';
import { setOnSessionExpired } from '../services/axiosInstance';
import { clearSession, purgeLegacyTokens } from '../services/storage';

// Avisa a las otras pestañas que se cerró la sesión (la cookie es compartida).
const AUTH_CHANNEL = 'printops-auth';
function authChannel(): BroadcastChannel | null {
  try {
    return typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(AUTH_CHANNEL) : null;
  } catch {
    return null;
  }
}
import type { AuthAction, AuthResponse, AuthState } from '../types/auth';

const initialState: AuthState = {
  user: null,
  token: null,
  refreshToken: null,
  isLoading: true,
  isAuthenticated: false,
};

export function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      // Mismo valor: devolver el mismo estado evita re-renderizar a todos los consumidores.
      return state.isLoading === action.payload ? state : { ...state, isLoading: action.payload };

    case 'RESTORE_TOKEN':
      if (!action.payload) {
        return { ...initialState, isLoading: false };
      }
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        refreshToken: action.payload.refreshToken ?? null,
        isAuthenticated: true,
        isLoading: false,
      };

    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        refreshToken: action.payload.refreshToken ?? null,
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
  signInWithGoogle: (idToken: string, rememberMe: boolean) => Promise<GoogleLoginResult>;
  completeGoogleOnboarding: (
    onboardingToken: string,
    rememberMe: boolean,
    choice: { inviteToken?: string; workspaceName?: string },
  ) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Restaurar sesión al iniciar.
  useEffect(() => {
    let cancelled = false;
    purgeLegacyTokens();
    authService
      .restoreSession()
      .then((session) => {
        if (cancelled) return;
        dispatch({
          type: 'RESTORE_TOKEN',
          payload: session
            ? { user: session.user, token: session.accessToken, refreshToken: session.refreshToken }
            : null,
        });
        if (session) webSocketService.connect(session.user.id);
      })
      .catch(() => {
        if (!cancelled) dispatch({ type: 'RESTORE_TOKEN', payload: null });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Si el interceptor no puede renovar el token, se vuelve al login.
  useEffect(() => {
    setOnSessionExpired(() => {
      webSocketService.disconnect();
      clearSession();
      dispatch({ type: 'LOGOUT' });
    });
    return () => setOnSessionExpired(null);
  }, []);

  // Logout en otra pestaña: llega por BroadcastChannel.
  useEffect(() => {
    const channel = authChannel();
    if (!channel) return;
    channel.onmessage = (e: MessageEvent) => {
      if (e.data === 'logout') {
        webSocketService.disconnect();
        clearSession();
        dispatch({ type: 'LOGOUT' });
      }
    };
    return () => channel.close();
  }, []);

  const applyAuth = useCallback((data: AuthResponse) => {
    dispatch({
      type: 'LOGIN_SUCCESS',
      payload: { user: data.user, token: data.accessToken, refreshToken: data.refreshToken },
    });
    webSocketService.connect(data.user.id);
  }, []);

  // Sin SET_LOADING en los logins: isLoading reemplaza la pantalla por el loader y desmontaría
  // Login/onboarding (perderíamos el formulario ante un error). Cada pantalla maneja su loading.
  const login = useCallback(
    async (email: string, password: string, rememberMe: boolean) => {
      applyAuth(await authService.login(email, password, rememberMe));
    },
    [applyAuth],
  );

  const signInWithGoogle = useCallback(
    async (idToken: string, rememberMe: boolean): Promise<GoogleLoginResult> => {
      const deviceId = authService.getOrCreateDeviceId();
      const result = await authService.loginWithGoogle(idToken, deviceId, rememberMe);
      if (result.type === 'authenticated') applyAuth(result.auth);
      return result;
    },
    [applyAuth],
  );

  const completeGoogleOnboarding = useCallback(
    async (
      onboardingToken: string,
      rememberMe: boolean,
      choice: { inviteToken?: string; workspaceName?: string },
    ) => {
      const deviceId = authService.getOrCreateDeviceId();
      applyAuth(await authService.completeGoogleOnboarding(onboardingToken, deviceId, rememberMe, choice));
    },
    [applyAuth],
  );

  // Sin auto-login: el usuario debe verificar su email antes de iniciar sesión.
  const register = useCallback(
    (email: string, password: string, inviteToken?: string, workspaceName?: string): Promise<string> =>
      authService.register(email, password, inviteToken, workspaceName),
    [],
  );

  const token = state.token;
  const logout = useCallback(async () => {
    try {
      const deviceId = authService.getOrCreateDeviceId();
      if (token) {
        await authService.logout(deviceId, token);
      }
    } catch {
      // Falla remota (red/401): igual cerramos la sesión local.
    } finally {
      webSocketService.disconnect();
      clearSession();
      dispatch({ type: 'LOGOUT' });
      const channel = authChannel();
      channel?.postMessage('logout');
      channel?.close();
    }
  }, [token]);

  const value = useMemo(
    () => ({ state, login, register, signInWithGoogle, completeGoogleOnboarding, logout }),
    [state, login, register, signInWithGoogle, completeGoogleOnboarding, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext debe usarse dentro de AuthProvider');
  return ctx;
}
