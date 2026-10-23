/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// La API se consume en el mismo origen (/api, /ws). En desarrollo Vite hace de proxy al
// backend (VITE_API_BASE_URL, default http://localhost:8083); en producción lo hace nginx
// (ver nginx/default.conf.template).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = (env.VITE_API_BASE_URL || 'http://localhost:8083').replace(/\/+$/, '');

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
        manifest: {
          name: 'PrintOps',
          short_name: 'PrintOps',
          description: 'Gestión de impresoras 3D: mantenimiento, repuestos, presupuestos y producción.',
          lang: 'es',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          theme_color: '#007aff',
          background_color: '#f2f2f7',
          icons: [
            { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
            { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          // La app (HTML, JS, CSS) queda en cache para abrir sin conexión. Los datos de la
          // API nunca se cachean: son privados y cambian todo el tiempo.
          globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//, /^\/ws/, /^\/actuator\//, /^\/v3\/api-docs/, /^\/swagger-ui/],
          cleanupOutdatedCaches: true,
        },
      }),
    ],
    server: {
      port: 5173,
      proxy: {
        '/api': { target, changeOrigin: true },
        '/ws': { target, changeOrigin: true, ws: true },
      },
    },
    preview: {
      port: 4173,
      proxy: {
        '/api': { target, changeOrigin: true },
        '/ws': { target, changeOrigin: true, ws: true },
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      css: { modules: { classNameStrategy: 'non-scoped' } },
      include: ['__tests__/**/*.test.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
    },
  };
});
