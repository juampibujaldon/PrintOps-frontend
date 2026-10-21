/* eslint-env jest */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
require('react-native-gesture-handler/jestSetup');
// El mock oficial crea un shared value nuevo en cada render; el real es estable. Lo igualamos
// para que los tests de re-renders no midan un artefacto del mock.
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const mock = require('react-native-reanimated/mock');
  const originalUseSharedValue = mock.useSharedValue;
  return {
    ...mock,
    useSharedValue: init => React.useRef(originalUseSharedValue(init)).current,
  };
});
jest.mock('react-native-keychain', () => ({
  setGenericPassword: jest.fn(),
  getGenericPassword: jest.fn(),
  resetGenericPassword: jest.fn(),
}));
// lucide-react-native publica ESM (.mjs) con miles de íconos: en tests cada ícono es un componente vacío.
jest.mock('lucide-react-native', () =>
  new Proxy({__esModule: true}, {
    get: (target, key) => (key in target ? target[key] : () => null),
  }),
);
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);
