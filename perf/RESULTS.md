# Resultados

Medido con `npx jest` (26 tests, 9 suites), `tsc --noEmit` (0 errores antes y después) y bundle Android release
(`--reset-cache` en la corrida final).

| # | Optimización | Métrica | Antes | Después |
|---|---|---|---|---|
| 1 | Pantallas lazy (`getComponent`) | Pantallas evaluadas al importar `AppNavigator` | 19 / 32 | 2 / 32 (Splash, Login) |
| 1 | idem | Pantallas evaluadas tras importar también `RoleNavigator` | 32 / 32 | 3 / 32 (+ Home, inicial) |
| 2 | `inlineRequires: true` explícito | valor efectivo | true (default) | true (explícito, test de regresión) |
| 3a | `React.memo(PrinterCard)` + `onPress` estable | Re-renders de 8 tarjetas ante estado no relacionado | 8 | 0 |
| 3b | `React.memo(CanvasNodeItem/DotGrid)`, Map por id, callbacks estables | Re-renders de 6 nodos ante re-render del padre | 6 | 0 |
| 3c | `ToastContext` value memoizado | Re-renders de consumidor por toast | 1 | 0 |
| 3c | `authReducer` SET_LOADING igual | Estado devuelto | objeto nuevo | mismo objeto |
| 3d | `useDraftAutosave` (1 intervalo) | `setInterval` creados tras 5 cambios | 6 (inferido del código: 1 + uno por cambio; no medido) | 1 |
| 3d | idem | Borrador guardado si se edita sin pausa >30 s | nunca (el intervalo se reiniciaba) | sí |
| 4a | Check de token vigente antes de refrescar | Refresh calls, 2 x 401 concurrentes | 1 | 1 |
| 4a | idem | Refresh calls, 2da 401 llega tras el refresh | 2 | 1 |
| 4b | Timeout multipart | Timeout FormData | 15 s | 60 s (JSON sigue en 15 s) |
| 5 | Fotos con `maxWidth/maxHeight` 1280 | Opciones del picker | quality 0.7 | + 1280x1280 (sin medir bytes: requiere dispositivo) |
| 6 | `transform-remove-console` (prod) | `console.log/info/debug` en bundle | 15 | 0 |
| 6 | idem | Bundle bytes | 6 031 119 | 6 031 551 (+432, ruido: wrappers `getComponent`, 2 módulos nuevos) |
| 6 | idem | Módulos `__d(` | 3 502 | 3 504 (+`constants/media`, `hooks/useDraftAutosave`) |

## Lo que NO se pudo verificar
- Tiempo real de arranque / TTI y consumo de memoria: requiere dispositivo o emulador (no se corrió la app).
  Las pantallas lazy y `inlineRequires` se midieron como cantidad de módulos evaluados en jest, no en Hermes.
- Peso real de las fotos con el cap de 1280 px (depende del dispositivo).
- Que la animación/gestos del canvas sigan igual en dispositivo: los tests usan el mock de reanimated.
- `getComponent` en el Drawer de React Navigation 6 está cubierto por tipos y por el bundle, no por una navegación real.

## Omitido a propósito
- `CanvasNodeItem` copia `positions.value` en cada frame de arrastre: se podría usar `positions.modify()`
  de reanimated, pero no puedo validar el comportamiento en el hilo UI sin dispositivo y con ~decenas de
  impresoras el costo es bajo. Sin cambios.
- Staleness window para refetch-on-focus: no era requerido.

## Recomendaciones (fuera de alcance)
- Android release: habilitar `enableProguardInRelease`/minify de R8 y `shrinkResources`, usar
  `reactNativeArchitectures` limitados a arm64-v8a/armeabi-v7a (o App Bundle con splits por ABI).
- Revisar el parche `react-native-gesture-handler+3.0.0.patch`: no aplica a la 2.20.2 instalada.
- Thumbnails de lista: pedir al backend versiones reducidas; hoy `photoUrl` baja la imagen completa.
- Convertir `HomeScreen` a `FlatList` con `getItemLayout`/`windowSize` si la lista crece.
- `lucide-react-native` ESM: importar íconos individuales si el bundle pesa.
