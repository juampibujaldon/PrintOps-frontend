// src/constants/theme.ts
import { TextStyle, ViewStyle } from 'react-native';

// Paleta neutra industrial (tokens estilo iOS).
export const Colors = {
  background: '#F2F2F7', // fondo de pantalla
  surface: '#FFFFFF', // tarjetas / superficies elevadas
  separator: '#E5E5EA', // bordes y divisores
  textPrimary: '#1C1C1E', // títulos / texto principal
  textSecondary: '#3C3C43', // texto secundario
  textTertiary: '#6B7280', // texto terciario / placeholders
  accent: '#0A84FF', // acciones y links
  onAccent: '#FFFFFF', // texto sobre acento
  error: '#FF3B30',

  // Estados de impresora
  statusOperativa: '#34C759',
  statusMantenim: '#FF9500',
  statusFuera: '#FF3B30',
  statusUnknown: '#8E8E93',

  // Estados de orden
  orderPending: '#8E8E93',
  orderInProgress: '#0A84FF',
  orderInReview: '#FF9500',
  orderCompleted: '#34C759',
  orderCancelled: '#FF3B30',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
};

// Sombras sutiles tipo iOS para el toque premium.
export const Shadows: Record<'card' | 'floating', ViewStyle> = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  floating: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
};

// Escala tipográfica iOS (SF Pro cae por defecto en iOS).
export const Typography: Record<string, TextStyle> = {
  largeTitle: { fontSize: 34, fontWeight: '700', letterSpacing: 0.37 },
  title1: { fontSize: 28, fontWeight: '700', letterSpacing: 0.36 },
  title2: { fontSize: 22, fontWeight: '700', letterSpacing: 0.35 },
  title3: { fontSize: 20, fontWeight: '600', letterSpacing: 0.38 },
  headline: { fontSize: 17, fontWeight: '600', letterSpacing: -0.41 },
  body: { fontSize: 17, fontWeight: '400', letterSpacing: -0.41 },
  callout: { fontSize: 16, fontWeight: '400', letterSpacing: -0.32 },
  subheadline: { fontSize: 15, fontWeight: '400', letterSpacing: -0.24 },
  footnote: { fontSize: 13, fontWeight: '400', letterSpacing: -0.08 },
  caption1: { fontSize: 12, fontWeight: '400', letterSpacing: 0 },
  caption2: { fontSize: 11, fontWeight: '400', letterSpacing: 0.07 },
  labelUppercase: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
};
