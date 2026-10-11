// src/screens/SplashScreen.tsx
import React from 'react';
import { StatusBar, StyleSheet, useWindowDimensions, View } from 'react-native';
import PrintOpsLogo from '../components/brand/PrintOpsLogo';

// Se muestra solo mientras la app realmente está cargando (restaurar sesión,
// login): el AppNavigator la desmonta cuando isLoading pasa a false, aunque la
// animación no haya terminado. No se agrega ninguna espera artificial.
export default function SplashScreen() {
  const { width } = useWindowDimensions();
  const logoWidth = Math.min(width * 0.82, 440);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <PrintOpsLogo width={logoWidth} animated />
    </View>
  );
}

const styles = StyleSheet.create({
  // Negro, igual que el launch screen nativo: la transición no parpadea.
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000000' },
});
