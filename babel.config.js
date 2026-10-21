module.exports = api => {
  const isProduction = api.env('production');
  return {
    presets: ['module:@react-native/babel-preset'],
    plugins: [
      // Los console.log/info/debug cuestan en el hilo JS y filtran datos en producción.
      ...(isProduction ? [['transform-remove-console', {exclude: ['error', 'warn']}]] : []),
      // El plugin de reanimated debe ir siempre último.
      'react-native-reanimated/plugin',
    ],
  };
};
