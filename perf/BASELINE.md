# Baseline (antes de cualquier cambio)

Rama `feature`, RN 0.76.5, bundle Android release (`--dev false --minify true`).

| Medición | Valor |
|---|---|
| Bundle (bytes) | 6 031 119 |
| Source map (bytes) | 15 610 195 |
| Módulos (`__d(`) | 3 502 |
| `console.log/info/debug` en el bundle | 15 (RN internals + app `Error checking biometrics`, `Biometrics error`) |
| `inlineRequires` | `true` por defecto en `@react-native/metro-config` (metro.config.js no lo declaraba) |
| Pantallas evaluadas al importar `AppNavigator` (jest, 32 módulos en `src/screens`) | 19 |
| Pantallas evaluadas al importar `AppNavigator` + `RoleNavigator` | 32 de 32 |
| `tsc --noEmit` errores | 0 |
| Tests | 0 (jest no estaba instalado) |
| Re-renders de `PrinterCard` (8 tarjetas) al cambiar un estado no relacionado de HomeScreen | 8 |
| Re-renders de `CanvasNodeItem` (6 nodos) al re-renderizar el padre sin cambios | 6 |
| Re-renders de consumidores de `useToast` al mostrar un toast | 1 por toast |
| Refresh calls con 2 requests 401 que llegan separadas (la 2da tras terminar el refresh) | 2 |
| Timeout de subidas FormData | 15 000 ms |

Notas: `patch-package` falla en `postinstall` (el parche `react-native-gesture-handler+3.0.0.patch`
es para 3.0.0 y está instalada la 2.20.2). Se instaló con `--ignore-scripts`; el parche no se aplica.
`react-native-svg+15.15.5.patch` sí aplica.
