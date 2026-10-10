import React from 'react';
import { Pressable } from 'react-native';
import { Menu } from 'lucide-react-native';
import { DefaultTheme, Theme } from '@react-navigation/native';
import { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { Colors, Icons } from '../constants/theme';

// Tema de React Navigation alineado con la paleta de la app.
export const navigationTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.primary,
    background: Colors.background,
    card: Colors.background,
    text: Colors.textPrimary,
    border: Colors.separator,
    notification: Colors.red,
  },
};

// Headers estilo iOS: mismo color que el fondo, sin sombra, título semibold y
// botón de volver en color de acento. Transición de push nativa en ambas plataformas.
export const stackScreenOptions: NativeStackNavigationOptions = {
  headerStyle: { backgroundColor: Colors.background },
  headerShadowVisible: false,
  headerTintColor: Colors.primary,
  headerTitleStyle: { fontWeight: '600', fontSize: 17, color: Colors.textPrimary },
  headerBackTitleVisible: false,
  contentStyle: { backgroundColor: Colors.background },
  animation: 'slide_from_right',
  animationDuration: 320,
};

export function DrawerToggle({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Abrir menú"
      style={({ pressed }) => ({ opacity: pressed ? 0.4 : 1, marginRight: 8 })}
    >
      <Menu color={Colors.primary} size={22} strokeWidth={Icons.strokeWidth} />
    </Pressable>
  );
}
