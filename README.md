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

Variables de entorno (prefijo `VITE_`, ver `.env.example`):

| Variable | Default | Uso |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8083` | URL base de la API REST y del WebSocket (`ws://…/ws`) |
| `VITE_GOOGLE_CLIENT_ID` | client ID web actual | Inicio de sesión con Google. Vacío = el botón no se muestra |

Para Google hay que agregar `http://localhost:5173` (y el dominio de producción) como *Authorized JavaScript origin*
del client ID web en Google Cloud Console.

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

- Los tokens viven en `localStorage` (si se marca "Recordar sesión") o `sessionStorage` (muere al cerrar el navegador).
- El `deviceId` es un UUID persistido en `localStorage`.
- Nota de seguridad: guardar el refresh token en el storage del navegador es vulnerable a XSS; la mejora futura es una
  cookie `httpOnly` (requiere cambios en el backend).

## Pruebas end-to-end de la API

`e2e/api-e2e.mjs` valida el contrato de la API contra un backend en ejecución (no depende de la UI).
