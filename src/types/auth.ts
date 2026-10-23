// src/types/auth.ts

export type Role = 'MANAGER' | 'TECNICO';

export interface UserInfo {
  id: number;
  email: string;
  role: Role;
  workspaceId: number | null;
}

export interface AuthResponse {
  accessToken: string;
  /** Ya no viene en el JSON: el backend lo deja en una cookie httpOnly. */
  refreshToken?: string | null;
  expiresIn: number;
  user: UserInfo;
}

export interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  inviteToken?: string;
  workspaceName?: string;
}

export type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'LOGIN_SUCCESS'; payload: { user: UserInfo; token: string; refreshToken?: string | null } }
  | { type: 'LOGOUT' }
  | { type: 'RESTORE_TOKEN'; payload: { user: UserInfo; token: string; refreshToken?: string | null } | null };

export interface AuthState {
  user: UserInfo | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export type InviteErrorCode = 'INVITE_NOT_FOUND' | 'INVITE_USED' | 'INVITE_EXPIRED' | 'INVITE_WRONG_EMAIL';

/** location.state de /google-onboarding. */
export interface GoogleOnboardingState {
  onboardingToken: string;
  email: string;
  name: string | null;
  rememberMe: boolean;
}

/** location.state de /invite-error. */
export interface InviteErrorState {
  code: InviteErrorCode;
  email?: string;
  message?: string;
}

/** location.state de /verify-email. */
export interface VerifyEmailState {
  email: string;
}

/** location.state de /register ('create' = abrir en "Crear taller"). */
export interface RegisterState {
  mode?: 'create';
}
