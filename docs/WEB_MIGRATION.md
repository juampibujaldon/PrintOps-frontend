# Migración React Native → React Web

Rama: `feat/react-web`. El código RN original queda intacto como referencia en
`/Users/juampibujaldon/Documents/GitHub/PrintOps-frontend/src` (checkout de `main`).

## Stack

| Concepto | RN (antes) | Web (ahora) |
|---|---|---|
| Build | Metro + Babel | **Vite 5** + TypeScript 5 (strict) |
| UI | react-native | **React 18.3 DOM** |
| Navegación | react-navigation (stack + drawer) | **react-router-dom 6** (`createBrowserRouter`, rutas lazy) |
| Estilos | `StyleSheet` | **CSS Modules** (`X.module.css`) + tokens globales en `src/styles/tokens.css` (CSS custom properties) |
| Íconos | lucide-react-native | **lucide-react** |
| Formularios | react-hook-form + yup | igual |
| HTTP | axios | igual |
| WebSocket | @stomp/stompjs + text-encoding | @stomp/stompjs (WebSocket nativo, sin polyfill, sin SockJS) |
| Storage | AsyncStorage + Keychain | `src/services/storage.ts` sobre `localStorage`/`sessionStorage` |
| Biometría | react-native-biometrics | **se elimina** (sin soft-logout: `keepSession=false` siempre) |
| Google | @react-native-google-signin | **@react-oauth/google** (`GoogleLogin` → `credential` = idToken) |
| Toast | react-native-toast-message + ToastContext | solo `ToastContext` (propio) |
| Alert.alert | RN | `useConfirm()` / `ConfirmDialog` propio (nunca `window.confirm`) |
| Modal / BottomSheet | RN Modal, @gorhom/bottom-sheet | `ui/Modal` (portal, overlay, Esc, focus trap básico; en mobile se ve como sheet inferior) |
| DateTimePicker | community | `<input type="date">` |
| Image picker | react-native-image-picker | `<input type="file" accept="image/*">` (+ `capture="environment"` para cámara) y `src/utils/image.ts` que redimensiona a `PHOTO_MAX_DIMENSION` (1280) con canvas → `Blob` jpeg |
| QR (mostrar) | react-native-qrcode-svg | **qrcode.react** (`QRCodeSVG`) |
| QR (escanear) | vision-camera | `getUserMedia` + **jsqr** sobre frames de `<video>`; siempre con entrada manual del número de serie como alternativa |
| PDF de presupuesto | blob-util + share | axios `responseType: 'blob'` → `URL.createObjectURL` → descargar / abrir; `navigator.share({files})` si está disponible |
| Swipeable (QuoteHistory) | gesture-handler | botones de acción / menú en la fila |
| Animaciones | reanimated | CSS transitions/keyframes; respetar `prefers-reduced-motion` |
| SVG | react-native-svg | SVG nativo del DOM |
| Splash | animación reanimated | pantalla de carga simple mientras se restaura la sesión (logo SVG estático) |
| Tests | jest preset RN | **Vitest + @testing-library/react + jsdom** |

## Config

- `VITE_API_BASE_URL` (default `http://localhost:8083`) en `src/constants/api.ts`.
- `VITE_GOOGLE_CLIENT_ID` (default el web client ID actual de `src/constants/google.ts`).
- `.env.example` documenta ambas.
- El backend ya acepta orígenes `*` por CORS y WS (`ws://…/ws`, STOMP nativo, header `Authorization` en CONNECT).
- Para Google, en Google Cloud Console hay que agregar `http://localhost:5173` (y el dominio de prod) como *Authorized JavaScript origin* del web client.

## Sesión / tokens

- `storage.ts` expone get/set/remove para: access token, refresh token, user, deviceId.
- `rememberMe = true` → `localStorage`; `false` → `sessionStorage` (la sesión muere al cerrar el navegador).
- `deviceId`: `crypto.randomUUID()` persistido en `localStorage`.
- Se mantiene toda la lógica del interceptor: single-flight refresh, retry 401, normalización de errores de validación, `setOnSessionExpired`.
- Nota de seguridad: el refresh token en storage del navegador es vulnerable a XSS; la mejora futura es cookie httpOnly (requiere cambio de backend). Documentado, fuera de alcance.

## Rutas

Públicas (redirigen a `/` si hay sesión):
`/login`, `/register`, `/verify-email`, `/reset-password`, `/google-onboarding`, `/invite-error`

Privadas (dentro de `AppShell`: sidebar fija en desktop ≥ 900px, drawer con hamburguesa en mobile):

| Ruta | Pantalla |
|---|---|
| `/` | redirect → `/printers` |
| `/printers` | HomeScreen |
| `/printers/new` | AddPrinterScreen |
| `/printers/scan` | ScanPrinterScreen |
| `/printers/:printerId` | PrinterDetailScreen |
| `/printers/:printerId/history` | PrinterHistoryScreen |
| `/printers/:printerId/components` | PrinterComponentsScreen |
| `/printers/:printerId/rules` | PrinterRulesScreen |
| `/printers/:printerId/orders/new` | CreateOrderScreen |
| `/orders` | OrdersListScreen |
| `/orders/:orderId` | OrderDetailScreen |
| `/dashboard` | DashboardScreen |
| `/parts` | StockScreen |
| `/parts/:partId` | SparePartDetailScreen |
| `/quotes` | QuoteHistoryScreen |
| `/quotes/new` | QuoteCalculatorScreen |
| `/quotes/:quoteId` | QuoteCalculatorScreen |
| `/workshop` | WorkshopCanvasScreen |
| `/notifications` | NotificationsScreen |
| `/profile` | PerfilScreen |
| `/settings` | ConfiguracionScreen |
| `/settings/workspace` | SettingsWorkspaceScreen |
| `/settings/notifications` | SettingsNotificationsScreen |
| `/settings/quote-defaults` | SettingsQuoteDefaultsScreen |
| `/settings/printers` | SettingsPrintersScreen |
| `/settings/about` | SettingsAboutScreen |
| `/terms`, `/privacy` | Terms / Privacy (accesibles también sin sesión) |
| `*` | 404 simple |

Reglas de parámetros: lo que en RN viajaba como objeto (`route.params.printer`) ahora se
lee del path (`useParams`) y **la pantalla debe funcionar al recargar** (fetch por id).
Se puede pasar el objeto en `location.state` como optimización para pintar al instante.
Parámetros no-id (`email`, `onboardingToken`, `code`…) van por `location.state`; si faltan,
redirigir a `/login`.

Sidebar (orden del drawer actual): Impresoras, Dashboard, Repuestos, Presupuestos, Taller,
Notificaciones, Perfil, Configuración, + Cerrar sesión.

## Convenciones

- Español en toda la UI (copiar textos del original).
- Mantener tipos (`src/types`), constantes y lógica de negocio sin cambios salvo lo necesario.
- Cada pantalla: `src/screens/XScreen.tsx` + `XScreen.module.css`. Componentes: igual.
- Layout responsive, sin scroll horizontal, usable desde 360px de ancho. Listas largas como
  grilla de cards en desktop.
- Accesible: botones reales (`<button>`), labels en inputs, foco visible, `aria-*` en modales.
- `FlatList`/`RefreshControl` → lista normal + botón "Actualizar"; paginación con "Cargar más"
  o IntersectionObserver.
- No usar `any` nuevo innecesario; `npm run build` (tsc + vite) y `npm run lint` deben pasar.

## Fuera de la app

- Se eliminan `ios/`, `android/`, `metro.config.js`, `babel.config.js`, `index.js`, `app.json`,
  `Gemfile*`, `patches/`, `patch1.js`, `setup.sh`, `jest.*`, `perf/` (métricas de bundle RN).
- Se conserva `e2e/api-e2e.mjs` (contrato de API, independiente de la UI).
