import { TextStyle } from 'react-native';
import { Easing, withTiming, withSpring, ReduceMotion } from 'react-native-reanimated';

// 1. COLORS
// Paleta basada en los colores de sistema de iOS: fondos agrupados en gris muy
// claro, superficies blancas, un único color de acento y semánticos sobrios.
export const LightColors = {
  background: '#F2F2F7', // systemGroupedBackground
  surface: '#FFFFFF', // secondarySystemGroupedBackground
  surfaceElevated: '#FFFFFF',
  fill: 'rgba(118, 118, 128, 0.12)', // tertiarySystemFill: inputs, chips
  fillPressed: 'rgba(118, 118, 128, 0.20)',
  primary: '#007AFF', // systemBlue
  onPrimary: '#FFFFFF',
  primaryPressed: '#0062CC',
  primaryDisabled: 'rgba(0, 122, 255, 0.35)',
  primaryTint: 'rgba(0, 122, 255, 0.10)',
  secondary: '#8E8E93',
  textPrimary: '#1C1C1E', // label
  textSecondary: '#6E6E73', // secondaryLabel
  textTertiary: '#AEAEB2', // tertiaryLabel
  textDisabled: '#C7C7CC',
  border: '#E5E5EA',
  separator: '#C6C6C8', // opaqueSeparator, usar con hairlineWidth
  overlay: 'rgba(0, 0, 0, 0.32)',

  // Semánticos: fondo suave + texto oscuro (contraste AA)
  successBg: 'rgba(52, 199, 89, 0.14)',
  successText: '#1E7B34',
  warningBg: 'rgba(255, 149, 0, 0.14)',
  warningText: '#A35A00',
  errorBg: 'rgba(255, 59, 48, 0.12)',
  errorText: '#C4281C',
  infoBg: 'rgba(0, 122, 255, 0.10)',
  infoText: '#0058B9',

  // Colores sólidos de sistema
  green: '#34C759',
  orange: '#FF9500',
  red: '#FF3B30',
  gray: '#8E8E93',

  // Legacy mappings para pantallas no migradas
  statusOperativa: '#34C759',
  statusMantenim: '#FF9500',
  statusFuera: '#FF3B30',
  statusUnknown: '#AEAEB2',
  orderPending: '#8E8E93',
  orderInProgress: '#007AFF',
  orderInReview: '#FF9500',
  orderCompleted: '#34C759',
  orderCancelled: '#FF3B30',
  accent: '#007AFF',
  onAccent: '#FFFFFF',
  error: '#FF3B30',
};

export const DarkColors: typeof LightColors = {
  background: '#000000',
  surface: '#1C1C1E',
  surfaceElevated: '#2C2C2E',
  fill: 'rgba(118, 118, 128, 0.24)',
  fillPressed: 'rgba(118, 118, 128, 0.36)',
  primary: '#0A84FF',
  onPrimary: '#FFFFFF',
  primaryPressed: '#0070E0',
  primaryDisabled: 'rgba(10, 132, 255, 0.35)',
  primaryTint: 'rgba(10, 132, 255, 0.18)',
  secondary: '#8E8E93',
  textPrimary: '#FFFFFF',
  textSecondary: '#AEAEB2',
  textTertiary: '#636366',
  textDisabled: '#48484A',
  border: '#38383A',
  separator: '#38383A',
  overlay: 'rgba(0, 0, 0, 0.48)',

  successBg: 'rgba(48, 209, 88, 0.18)',
  successText: '#30D158',
  warningBg: 'rgba(255, 159, 10, 0.18)',
  warningText: '#FF9F0A',
  errorBg: 'rgba(255, 69, 58, 0.18)',
  errorText: '#FF453A',
  infoBg: 'rgba(10, 132, 255, 0.18)',
  infoText: '#409CFF',

  green: '#30D158',
  orange: '#FF9F0A',
  red: '#FF453A',
  gray: '#8E8E93',

  statusOperativa: '#30D158',
  statusMantenim: '#FF9F0A',
  statusFuera: '#FF453A',
  statusUnknown: '#636366',
  orderPending: '#8E8E93',
  orderInProgress: '#0A84FF',
  orderInReview: '#FF9F0A',
  orderCompleted: '#30D158',
  orderCancelled: '#FF453A',
  accent: '#0A84FF',
  onAccent: '#FFFFFF',
  error: '#FF453A',
};

// La app es light-only por ahora; las pantallas leen Colors directamente.
export const Colors = LightColors;

// Fondo suave a partir de un color sólido (#RRGGBB), para badges y chips.
export const tint = (hex: string, alpha = 0.14): string => {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
};

// 2. TYPOGRAPHY
// Escala de Dynamic Type de iOS (tamaño "Large"), fuente del sistema.
export const Typography: Record<string, TextStyle> = {
  display: { fontSize: 34, fontWeight: '700', letterSpacing: 0.37 }, // Large Title
  title: { fontSize: 28, fontWeight: '700', letterSpacing: 0.36 },
  headline: { fontSize: 17, fontWeight: '600', letterSpacing: -0.41 },
  body: { fontSize: 17, fontWeight: '400', letterSpacing: -0.41 },
  callout: { fontSize: 16, fontWeight: '400', letterSpacing: -0.32 },
  subheadline: { fontSize: 15, fontWeight: '400', letterSpacing: -0.24 },
  footnote: { fontSize: 13, fontWeight: '400', letterSpacing: -0.08 },
  caption: { fontSize: 12, fontWeight: '400', letterSpacing: 0 },

  // Modificadores
  tabular: { fontVariant: ['tabular-nums'] },

  // Legacy aliases
  title1: { fontSize: 28, fontWeight: '700', letterSpacing: 0.36 },
  title2: { fontSize: 22, fontWeight: '700', letterSpacing: 0.35 },
  title3: { fontSize: 20, fontWeight: '600', letterSpacing: 0.38 },
  caption1: { fontSize: 12, fontWeight: '400', letterSpacing: 0 },
  caption2: { fontSize: 11, fontWeight: '400', letterSpacing: 0.06 },
  largeTitle: { fontSize: 34, fontWeight: '700', letterSpacing: 0.37 },
  // Encabezado de sección de lista agrupada (iOS usa footnote en mayúsculas).
  labelUppercase: { fontSize: 13, fontWeight: '400', letterSpacing: -0.08, textTransform: 'uppercase' },
};

// 3. SPACING, ICONS & RADII
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const Icons = {
  sm: 16,
  md: 20,
  lg: 24,
  strokeWidth: 1.75,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 14,
  xl: 20,
  full: 999,
};

// 4. SHADOWS
// Sombras muy difusas y de baja opacidad: la jerarquía la da el color de fondo,
// no los bordes ni sombras marcadas.
export const Shadows = {
  cardLight: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  cardDark: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  floatingLight: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
  floatingDark: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
  },

  // Legacy aliases
  card: { shadowColor: '#000000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  floating: { shadowColor: '#000000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 24, elevation: 8 },
};

// 5. MOTION (Reanimated)
export const Motion = {
  durations: {
    fast: 160,
    base: 260,
    slow: 380,
  },
  easings: {
    standard: Easing.bezier(0.25, 0.1, 0.25, 1), // ease de UIKit
    decelerate: Easing.bezier(0.32, 0.72, 0, 1), // salida suave de sheets/modales
  },
  springs: {
    bouncy: { damping: 18, mass: 1, stiffness: 180, reduceMotion: ReduceMotion.System },
    // Feedback de presión: rápido y sin rebote visible
    damped: { damping: 26, mass: 0.8, stiffness: 320, reduceMotion: ReduceMotion.System },
  },
};

// Reanimated helpers
export const withStandardTiming = (toValue: number, config?: object) => {
  return withTiming(toValue, { duration: Motion.durations.base, easing: Motion.easings.standard, reduceMotion: ReduceMotion.System, ...config });
};

export const withDampedSpring = (toValue: number, config?: object) => {
  return withSpring(toValue, { ...Motion.springs.damped, ...config });
};
