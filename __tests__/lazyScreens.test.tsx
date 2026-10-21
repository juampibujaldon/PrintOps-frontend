/* eslint-env jest */
// Los navegadores no deben evaluar los módulos de pantallas al importarse:
// cada pantalla se carga recién cuando se navega a ella (getComponent).

const evaluated: string[] = [];

const LAZY_SCREENS = [
  'AddPrinterScreen', 'PrinterDetailScreen', 'PrinterHistoryScreen', 'CreateOrderScreen',
  'OrderDetailScreen', 'OrdersListScreen', 'ScanPrinterScreen', 'PrinterComponentsScreen',
  'PrinterRulesScreen', 'SparePartDetailScreen', 'QuoteHistoryScreen', 'QuoteCalculatorScreen',
  'StockScreen', 'PerfilScreen', 'NotificationsScreen', 'DashboardScreen',
  'WorkshopCanvasScreen', 'ConfiguracionScreen', 'SettingsWorkspaceScreen',
  'SettingsNotificationsScreen', 'SettingsQuoteDefaultsScreen', 'SettingsPrintersScreen',
  'SettingsAboutScreen', 'TermsAndConditionsScreen', 'PrivacyPolicyScreen',
];
const EAGER_AUTH_SCREENS = [
  'SplashScreen', 'LoginScreen', 'RegisterScreen', 'ResetPasswordScreen',
  'VerifyEmailScreen', 'InviteErrorScreen',
  // Pantalla inicial de la app autenticada: se carga con TecnicoStack.
  'HomeScreen',
];

const evaluatedScreens = () => LAZY_SCREENS.filter(s => evaluated.includes(s));

beforeEach(() => {
  evaluated.length = 0;
  jest.resetModules();
  [...LAZY_SCREENS, ...EAGER_AUTH_SCREENS].forEach(name => {
    jest.doMock(`../src/screens/${name}`, () => {
      evaluated.push(name);
      return { __esModule: true, default: () => null };
    });
  });
});

describe('navigators defer screen modules until navigation', () => {
  it.each([
    ['TecnicoStack', '../src/navigation/TecnicoStack'],
    ['SettingsStack', '../src/navigation/SettingsStack'],
    ['TecnicoDrawer', '../src/navigation/TecnicoDrawer'],
    ['RoleNavigator', '../src/navigation/RoleNavigator'],
  ])('%s does not evaluate drawer/stack screens on import', (_n, path) => {
    jest.isolateModules(() => {
      require(path);
    });
    expect(evaluatedScreens()).toEqual([]);
  });

  it('AppNavigator keeps only auth screens eager', () => {
    jest.isolateModules(() => {
      require('../src/navigation/AppNavigator');
    });
    expect(evaluatedScreens()).toEqual([]);
    expect(evaluated).toEqual(['SplashScreen', 'LoginScreen']);
  });
});
