// src/constants/google.ts
// IDs de OAuth de Google Cloud Console (proyecto 501380806934).
// Mientras GOOGLE_WEB_CLIENT_ID sea '' el botón "Continuar con Google" no se muestra.

/** Client ID de tipo "Web application". Obligatorio: es el `aud` del idToken que valida el backend. */
export const GOOGLE_WEB_CLIENT_ID = '501380806934-812jqumdo68npmgul1j4ontisbjl00p9.apps.googleusercontent.com';

/** Client ID de tipo "iOS". Su versión invertida va en Info.plist (CFBundleURLTypes). */
export const GOOGLE_IOS_CLIENT_ID = ''; // PLACEHOLDER: 5678-xyz.apps.googleusercontent.com
