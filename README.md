# PrintOps Web

Aplicación web de PrintOps (gestión de impresoras 3D, órdenes de mantenimiento, repuestos y presupuestos).
React 18 + TypeScript + Vite, consumiendo el backend Spring Boot (`/api/...`, JWT Bearer y WebSocket STOMP en `/ws`).

> Migración desde React Native: ver [`docs/WEB_MIGRATION.md`](docs/WEB_MIGRATION.md) (decisiones de arquitectura, rutas y convenciones).

## Requisitos

- Node.js 18 o superior
- Backend de PrintOps corriendo (por defecto en `http://localhost:8083`)

## Puesta en marcha

```bash
npm install
cp .env.example .env     # opcional: ajustar URL del backend / client ID de Google
npm run dev              # http://localhost:5173
```

## Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo de Vite (puerto 5173) |
| `npm run build` | Chequeo de tipos (`tsc -b`) y build de producción en `dist/` |
| `npm run preview` | Sirve el build de `dist/` localmente |
| `npm test` | Tests con Vitest + Testing Library (jsdom) |
| `npm run lint` | ESLint (flat config: typescript-eslint, react-hooks, react-refresh) |

## Configuración

| Variable | Dónde | Uso |
|---|---|---|
| `VITE_API_BASE_URL` | `.env` (desarrollo) | Backend al que el **proxy de Vite** manda `/api` y `/ws` (default `http://localhost:8083`) |
| `VITE_GOOGLE_CLIENT_ID` | build | Client ID web de Google (vacío = sin botón de Google) |
| `BACKEND_URL` | contenedor nginx (producción) | Backend al que nginx manda `/api` y `/ws`. En Railway, la URL privada: `http://<servicio-backend>.railway.internal:<puerto>` |
| `PORT` | contenedor nginx | Lo asigna Railway |

La app y la API comparten origen (nginx en producción, Vite en desarrollo): es lo que permite que el
refresh token viaje en una cookie httpOnly `SameSite=Strict` sin CORS.

## Producción (Docker + nginx)

`Dockerfile` compila la app y la sirve con nginx (`nginx/default.conf.template`):

- SPA con fallback a `index.html`, assets con hash cacheados un año, `sw.js`/`index.html` sin cache.
- Proxy de `/api` y `/ws` (WebSocket) a `BACKEND_URL`.
- Cabeceras de seguridad (`nginx/security-headers.conf`): CSP estricta (solo scripts propios y los de
  Google Identity Services), HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`.

`railway.json` le indica a Railway que construya con ese Dockerfile.

## PWA

La app se puede instalar en el celular o la compu (manifest + service worker de `vite-plugin-pwa`).
El shell queda en cache y abre sin conexión; los datos de la API nunca se cachean.

## Tipos de la API

`src/api/schema.d.ts` se genera desde el OpenAPI del backend:

```bash
npm run gen:api                      # backend en http://localhost:8083
OPENAPI_URL=https://.../v3/api-docs npm run gen:api
```

`src/api/types.ts` expone alias legibles (`PrintJob`, `FilamentSpool`, `Profitability`, …).

## Estructura

```
src/
  components/   ui/ (UI kit), layout/ (AppShell, Sidebar, guards), auth/, brand/
  constants/    api, google, media, theme, estados de órdenes e impresoras
  context/      AuthContext, ToastContext, ConfirmContext (useConfirm / useAlert)
  hooks/        useAuth, useDashboardData, usePrinterHistory, useQuoteCalculator, useDraftAutosave, usePhotoPicker
  screens/      una pantalla por ruta (+ CSS Modules)
  services/     axiosInstance (refresh de token), authService, storage, webSocketService y servicios REST
  styles/       tokens.css (variables CSS) y global.css
  types/ utils/ router.tsx main.tsx
__tests__/      tests de Vitest
e2e/            api-e2e.mjs (contrato de la API, independiente de la UI)
```

## Sesión

Refresh token en cookie httpOnly (la pone el backend), access token solo en memoria. Al recargar, la
app pide un access token nuevo con la cookie. Ver `docs/WEB_MIGRATION.md`.

## Pruebas end-to-end de la API

`e2e/api-e2e.mjs` valida el contrato de la API contra un backend en ejecución (no depende de la UI).
