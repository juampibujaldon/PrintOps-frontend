// src/constants/google.ts
// Client ID de tipo "Web application" de Google Cloud Console (proyecto 501380806934).
// Es el `aud` del idToken que valida el backend. Si queda vacío, el botón
// "Continuar con Google" no se muestra.
const DEFAULT_GOOGLE_CLIENT_ID = '501380806934-812jqumdo68npmgul1j4ontisbjl00p9.apps.googleusercontent.com';

const envId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

export const GOOGLE_WEB_CLIENT_ID: string = envId !== undefined ? envId.trim() : DEFAULT_GOOGLE_CLIENT_ID;

export function isGoogleSignInConfigured(): boolean {
  return GOOGLE_WEB_CLIENT_ID.length > 0;
}
