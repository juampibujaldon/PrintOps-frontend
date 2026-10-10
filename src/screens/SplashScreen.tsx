// src/screens/SplashScreen.tsx
import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Printer } from 'lucide-react-native';
import { Colors, Spacing, Typography } from '../constants/theme';

export default function SplashScreen() {
  // El enrutador (AppNavigator) desmonta esta pantalla automáticamente cuando isLoading pasa a false.
  return (
    <View style={styles.container}>
      <Animated.View entering={FadeIn.duration(500)} style={styles.center}>
        <View style={styles.logo}>
          <Printer color={Colors.onPrimary} size={34} strokeWidth={1.75} />
        </View>
        <Text style={styles.title}>PrintOps</Text>
      </Animated.View>
      <ActivityIndicator color={Colors.textTertiary} style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  center: { alignItems: 'center' },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: Colors.textPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.title1,
    color: Colors.textPrimary,
  },
  spinner: {
    position: 'absolute',
    bottom: 80,
  },
});
