// src/hooks/useAuth.ts
import { useAuthContext } from '../context/AuthContext';
import { GoogleLoginResult } from '../services/authService';
import { UserInfo } from '../types/auth';

interface UseAuthReturn {
  user: UserInfo | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  register: (email: string, password: string, inviteToken?: string, workspaceName?: string) => Promise<string>;
  signInWithGoogle: (rememberMe: boolean) => Promise<GoogleLoginResult>;
  completeGoogleOnboarding: (
    onboardingToken: string,
    rememberMe: boolean,
    choice: { inviteToken?: string; workspaceName?: string },
  ) => Promise<void>;
  logout: () => Promise<void>;
  restore: (skipBiometrics?: boolean) => Promise<boolean>;
}

export function useAuth(): UseAuthReturn {
  const { state, login, register, signInWithGoogle, completeGoogleOnboarding, logout, restore } = useAuthContext();
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
    restore,
  };
}
