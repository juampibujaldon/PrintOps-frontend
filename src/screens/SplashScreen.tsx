// src/screens/SplashScreen.tsx
import React from 'react';
import { StatusBar, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Colors } from '../constants/theme';
import PrintOpsLogo from '../components/brand/PrintOpsLogo';

// Se muestra solo mientras la app está cargando. En el arranque, el AppNavigator
// la mantiene hasta que termina la animación (onFinish); en el login, solo
// mientras dura la request.
export default function SplashScreen({ onFinish }: { onFinish?: () => void }) {
  const { width } = useWindowDimensions();
  const logoWidth = Math.min(width * 0.82, 440);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <PrintOpsLogo width={logoWidth} animated onAnimationEnd={onFinish} />
    </View>
  );
}

const styles = StyleSheet.create({
  // Mismo fondo que el resto de la app y que el launch screen nativo: sin saltos de color.
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
});
