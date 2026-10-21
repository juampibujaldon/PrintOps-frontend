// src/hooks/useAuth.ts
import { useAuthContext } from '../context/AuthContext';
import type { GoogleLoginResult } from '../services/authService';
import type { UserInfo } from '../types/auth';

interface UseAuthReturn {
  user: UserInfo | null;
  token: string | null;
  isAuthenticated: boolean;
  /** true solo mientras se restaura la sesión al arrancar. */
  isLoading: boolean;
  login: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  register: (email: string, password: string, inviteToken?: string, workspaceName?: string) => Promise<string>;
  /** idToken = `credential` de <GoogleLogin />. */
  signInWithGoogle: (idToken: string, rememberMe: boolean) => Promise<GoogleLoginResult>;
  completeGoogleOnboarding: (
    onboardingToken: string,
    rememberMe: boolean,
    choice: { inviteToken?: string; workspaceName?: string },
  ) => Promise<void>;
  logout: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const { state, login, register, signInWithGoogle, completeGoogleOnboarding, logout } = useAuthContext();
  return {
    user: state.user,
    token: state.token,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    login,
    register,
    signInWithGoogle,
    completeGoogleOnboarding,
    logout,
  };
}
