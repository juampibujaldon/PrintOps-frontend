# PrintOps — Frontend

App mobile iOS del sistema de gestión de impresoras 3D **PrintOps**, construida con **React Native 0.76 (TypeScript)**.

> ⚠️ **Solo iOS por ahora.** El proyecto no tiene configuración de Android activa.

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Framework | React Native 0.76.5 |
| Lenguaje | TypeScript |
| Navegación | React Navigation v6 (Stack + Drawer) |
| Formularios | React Hook Form + Yup |
| HTTP | Axios con interceptor JWT automático |
| Autenticación | JWT + Refresh token (Keychain para almacenamiento seguro) |
| Cámara / Galería | react-native-image-picker |
| QR Rendering | react-native-qrcode-svg |

---

## Prerrequisitos

| Herramienta | Versión mínima | Cómo instalarlo |
|---|---|---|
| **macOS** | 13+ | — |
| **Xcode** | 15+ | App Store |
| **Node.js** | 18+ | `brew install node` |
| **CocoaPods** | Última | `brew install cocoapods` |
| **Watchman** | Última | `brew install watchman` |
| **Homebrew** | Cualquiera | [brew.sh](https://brew.sh) |

---

## Cómo levantar el proyecto

### Primera vez — Setup completo

El repo incluye un script que automatiza el proceso de inicialización:

```bash
# 1. Clonar el repositorio
git clone https://github.com/juampibujaldon/PrintOps-frontend.git
cd PrintOps-frontend

# 2. Dar permisos al script y ejecutarlo
chmod +x setup.sh
./setup.sh
```

El script hace automáticamente:
1. Verifica que Node.js y CocoaPods estén instalados.
2. Inicializa el proyecto base de React Native 0.76.5.
3. Copia los directorios nativos (`ios/`, `android/`).
4. Ejecuta `npm install`.
5. Ejecuta `pod install` en la carpeta iOS.

---

### Arranque diario (después del setup)

Abrí **dos terminales** en la raíz del proyecto:

**Terminal 1 — Metro bundler:**
```bash
npx react-native start
```

**Terminal 2 — Simulador iOS:**
```bash
npx react-native run-ios
```

Para correr en un dispositivo físico real, abrí `ios/PrintOpsFrontend.xcworkspace` en Xcode y seleccioná el dispositivo conectado.

---

## Configuración de la URL del backend

Editá `src/constants/api.ts`:

```ts
// iOS Simulator → apunta a localhost del Mac
// Android Emulator → usa 10.0.2.2 (alias al host)
export const API_BASE_URL =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:8080'
    : 'http://localhost:8080';
```

Si el backend corre en otra máquina de la red, reemplazá `localhost` por la IP local del servidor (ej: `http://192.168.1.100:8080`).

---

## Estructura del proyecto

```
src/
├── constants/
│   ├── api.ts           # URL base del backend y claves de AsyncStorage
│   └── theme.ts         # Paleta de colores y tokens de diseño
├── context/             # AuthContext (estado global de sesión)
├── hooks/
│   └── useAuth.ts       # Hook para acceder al contexto de auth
├── navigation/
│   ├── AppNavigator.tsx  # Navegador raíz (auth vs. app)
│   ├── RoleNavigator.tsx # Selección de stack según rol
│   ├── TecnicoStack.tsx  # Stack del técnico (Home, AddPrinter, Detail)
│   ├── TecnicoDrawer.tsx # Drawer lateral del técnico
│   └── AdminStack.tsx    # Stack del administrador
├── screens/
│   ├── HomeScreen.tsx         # Listado de impresoras (US-02)
│   ├── AddPrinterScreen.tsx   # Registro de impresora (US-01)
│   ├── PrinterDetailScreen.tsx # Detalle + QR de la impresora
│   ├── LoginScreen.tsx
│   ├── RegisterScreen.tsx
│   ├── SplashScreen.tsx
│   ├── PerfilScreen.tsx
│   ├── ConfiguracionScreen.tsx
│   └── TallerScreen.tsx
├── services/
│   ├── axiosInstance.ts   # Cliente HTTP con interceptor de JWT y refresh automático
│   ├── authService.ts     # Login, register, refresh, logout
│   └── printerService.ts  # CRUD de impresoras
└── types/
    └── auth.ts            # Tipos de usuario y sesión
```

---

## Comandos útiles

```bash
# Limpiar caché de Metro
npx react-native start --reset-cache

# Reinstalar pods (si hay errores nativos de iOS)
cd ios && pod install && cd ..

# Limpiar build de iOS
cd ios && xcodebuild clean && cd ..

# Ver logs del simulador en tiempo real
npx react-native log-ios
```

---

## Flujos implementados

| Flujo | Pantalla | Estado |
|---|---|:---:|
| Login con JWT | `LoginScreen` | ✅ |
| Registro de usuario | `RegisterScreen` | ✅ |
| Listado de impresoras | `HomeScreen` | 🟡 Parcial (sin filtros) |
| Registrar impresora | `AddPrinterScreen` | 🟡 Parcial (sin date picker) |
| Ver detalle + QR | `PrinterDetailScreen` | ✅ |
| Escanear QR | — | ❌ Pendiente |

---

## Notas de desarrollo

- El **access token** (JWT) se almacena en `AsyncStorage`. El **refresh token** se guarda en el **Keychain** del dispositivo para mayor seguridad.
- El interceptor de Axios (`axiosInstance.ts`) renueva el access token automáticamente ante un 401, sin necesidad de intervención del usuario.
- La autenticación biométrica (Face ID) está disponible mediante `react-native-biometrics` pero su activación depende del usuario en la pantalla de configuración.
