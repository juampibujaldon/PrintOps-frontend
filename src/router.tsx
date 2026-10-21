// src/router.tsx — todas las rutas de docs/WEB_MIGRATION.md
import { Navigate, createBrowserRouter } from 'react-router-dom';
import type { RouteObject } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import { PublicOnly, RequireAuth } from './components/layout/guards';
import LoadingScreen from './components/layout/LoadingScreen';
import StandaloneLayout from './components/layout/StandaloneLayout';
import RouteError from './components/layout/RouteError';

// Pantallas con carga diferida: el módulo se importa al entrar a la ruta.
const screen = (loader: () => Promise<{ default: React.ComponentType }>): Pick<RouteObject, 'lazy'> => ({
  lazy: async () => ({ Component: (await loader()).default }),
});

export const routes: RouteObject[] = [
  {
    errorElement: <RouteError />,
    HydrateFallback: LoadingScreen,
    children: [
      // ── Públicas (redirigen a "/" si hay sesión) ──
      {
        element: <PublicOnly />,
        children: [
          { path: '/login', ...screen(() => import('./screens/LoginScreen')) },
          { path: '/register', ...screen(() => import('./screens/RegisterScreen')) },
          { path: '/verify-email', ...screen(() => import('./screens/VerifyEmailScreen')) },
          { path: '/reset-password', ...screen(() => import('./screens/ResetPasswordScreen')) },
          { path: '/google-onboarding', ...screen(() => import('./screens/GoogleOnboardingScreen')) },
          { path: '/invite-error', ...screen(() => import('./screens/InviteErrorScreen')) },
        ],
      },

      // ── Legales: accesibles con y sin sesión ──
      {
        element: <StandaloneLayout />,
        children: [
          { path: '/terms', ...screen(() => import('./screens/TermsAndConditionsScreen')) },
          { path: '/privacy', ...screen(() => import('./screens/PrivacyPolicyScreen')) },
        ],
      },

      // ── Privadas (dentro de AppShell) ──
      {
        element: <RequireAuth />,
        children: [
          {
            element: <AppShell />,
            children: [
              { path: '/', element: <Navigate to="/printers" replace /> },
              { path: '/printers', ...screen(() => import('./screens/HomeScreen')) },
              { path: '/printers/new', ...screen(() => import('./screens/AddPrinterScreen')) },
              { path: '/printers/scan', ...screen(() => import('./screens/ScanPrinterScreen')) },
              { path: '/printers/:printerId', ...screen(() => import('./screens/PrinterDetailScreen')) },
              { path: '/printers/:printerId/history', ...screen(() => import('./screens/PrinterHistoryScreen')) },
              { path: '/printers/:printerId/components', ...screen(() => import('./screens/PrinterComponentsScreen')) },
              { path: '/printers/:printerId/rules', ...screen(() => import('./screens/PrinterRulesScreen')) },
              { path: '/printers/:printerId/orders/new', ...screen(() => import('./screens/CreateOrderScreen')) },
              { path: '/orders', ...screen(() => import('./screens/OrdersListScreen')) },
              { path: '/orders/:orderId', ...screen(() => import('./screens/OrderDetailScreen')) },
              { path: '/dashboard', ...screen(() => import('./screens/DashboardScreen')) },
              { path: '/parts', ...screen(() => import('./screens/StockScreen')) },
              { path: '/parts/:partId', ...screen(() => import('./screens/SparePartDetailScreen')) },
              { path: '/quotes', ...screen(() => import('./screens/QuoteHistoryScreen')) },
              { path: '/quotes/new', ...screen(() => import('./screens/QuoteCalculatorScreen')) },
              { path: '/quotes/:quoteId', ...screen(() => import('./screens/QuoteCalculatorScreen')) },
              { path: '/workshop', ...screen(() => import('./screens/WorkshopCanvasScreen')) },
              { path: '/notifications', ...screen(() => import('./screens/NotificationsScreen')) },
              { path: '/profile', ...screen(() => import('./screens/PerfilScreen')) },
              { path: '/settings', ...screen(() => import('./screens/ConfiguracionScreen')) },
              { path: '/settings/workspace', ...screen(() => import('./screens/SettingsWorkspaceScreen')) },
              { path: '/settings/notifications', ...screen(() => import('./screens/SettingsNotificationsScreen')) },
              { path: '/settings/quote-defaults', ...screen(() => import('./screens/SettingsQuoteDefaultsScreen')) },
              { path: '/settings/printers', ...screen(() => import('./screens/SettingsPrintersScreen')) },
              { path: '/settings/about', ...screen(() => import('./screens/SettingsAboutScreen')) },
            ],
          },
        ],
      },

      // ── 404 ──
      { path: '*', ...screen(() => import('./screens/NotFoundScreen')) },
    ],
  },
];

export const createAppRouter = () => createBrowserRouter(routes);
