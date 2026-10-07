import { TextStyle } from 'react-native';
import { Easing, withTiming, withSpring, ReduceMotion } from 'react-native-reanimated';

// 1. COLORS
export const LightColors = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  primary: '#4F46E5',
  onPrimary: '#FFFFFF',
  primaryPressed: '#4338CA',
  primaryDisabled: '#C7D2FE',
  secondary: '#64748B',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textTertiary: '#94A3B8',
  textDisabled: '#CBD5E1',
  border: '#E2E8F0',
  separator: '#E2E8F0', // Legacy alias
  
  // Semantic Colors (AA Contrast: Soft BG + Dark Text)
  successBg: '#D1FAE5',
  successText: '#065F46',
  warningBg: '#FEF3C7',
  warningText: '#92400E',
  errorBg: '#FEE2E2',
  errorText: '#991B1B',
  infoBg: '#DBEAFE',
  infoText: '#1E40AF',

  // Legacy mappings for un-migrated screens
  statusOperativa: '#10B981',
  statusMantenim: '#F59E0B',
  statusFuera: '#EF4444',
  statusUnknown: '#94A3B8',
  orderPending: '#94A3B8',
  orderInProgress: '#3B82F6',
  orderInReview: '#F59E0B',
  orderCompleted: '#10B981',
  orderCancelled: '#EF4444',
  accent: '#4F46E5',
  onAccent: '#FFFFFF',
  error: '#EF4444',
};

export const DarkColors = {
  background: '#0F172A',
  surface: '#1E293B',
  primary: '#6366F1',
  onPrimary: '#F8FAFC',
  primaryPressed: '#4F46E5',
  primaryDisabled: '#312E81',
  secondary: '#94A3B8',
  textPrimary: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textTertiary: '#64748B',
  textDisabled: '#475569',
  border: '#334155',
  separator: '#334155',
  
  // Semantic Colors (Dark mode: Darker BG + Lighter Text)
  successBg: '#064E3B',
  successText: '#34D399',
  warningBg: '#78350F',
  warningText: '#FBBF24',
  errorBg: '#7F1D1D',
  errorText: '#F87171',
  infoBg: '#1E3A8A',
  infoText: '#60A5FA',

  // Legacy mappings
  statusOperativa: '#34D399',
  statusMantenim: '#FBBF24',
  statusFuera: '#F87171',
  statusUnknown: '#64748B',
  orderPending: '#64748B',
  orderInProgress: '#60A5FA',
  orderInReview: '#FBBF24',
  orderCompleted: '#34D399',
  orderCancelled: '#F87171',
  accent: '#6366F1',
  onAccent: '#F8FAFC',
  error: '#F87171',
};

// Exportamos Colors temporalmente apuntando a Light para no romper pantallas legadas.
export const Colors = LightColors;

// 2. TYPOGRAPHY
// Escala completa usando fuente del sistema
export const Typography: Record<string, TextStyle> = {
  display: { fontSize: 34, fontWeight: '700', letterSpacing: 0.37 },
  title: { fontSize: 28, fontWeight: '700', letterSpacing: 0.36 },
  headline: { fontSize: 22, fontWeight: '600', letterSpacing: -0.26 },
  body: { fontSize: 17, fontWeight: '400', letterSpacing: -0.41 },
  callout: { fontSize: 16, fontWeight: '400', letterSpacing: -0.32 },
  subheadline: { fontSize: 15, fontWeight: '400', letterSpacing: -0.24 },
  footnote: { fontSize: 13, fontWeight: '400', letterSpacing: -0.08 },
  caption: { fontSize: 12, fontWeight: '500', letterSpacing: 0 },
  
  // Modificadores
  tabular: { fontVariant: ['tabular-nums'] },
  
  // Legacy aliases
  title1: { fontSize: 28, fontWeight: '700', letterSpacing: 0.36 },
  title2: { fontSize: 22, fontWeight: '700', letterSpacing: 0.35 },
  title3: { fontSize: 20, fontWeight: '600', letterSpacing: 0.38 },
  caption1: { fontSize: 12, fontWeight: '400', letterSpacing: 0 },
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
  strokeWidth: 2,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 999,
};

// 4. SHADOWS
export const Shadows = {
  cardLight: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardDark: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 2,
  },
  floatingLight: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  floatingDark: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  
  // Legacy aliases
  card: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  floating: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 8 },
};

// 5. MOTION (Reanimated)
export const Motion = {
  durations: {
    fast: 150,
    base: 250,
    slow: 350,
  },
  easings: {
    standard: Easing.bezier(0.25, 0.1, 0.25, 1), // Apple standard
    decelerate: Easing.bezier(0.32, 0.72, 0, 1), // Smooth exit for sheets/modals
  },
  springs: {
    bouncy: { damping: 15, mass: 1, stiffness: 150, reduceMotion: ReduceMotion.System },
    damped: { damping: 20, mass: 1, stiffness: 100, reduceMotion: ReduceMotion.System }, // For gestures and press feedback
  },
};

// Reanimated helpers
export const withStandardTiming = (toValue: number, config?: object) => {
  return withTiming(toValue, { duration: Motion.durations.base, easing: Motion.easings.standard, reduceMotion: ReduceMotion.System, ...config });
};

export const withDampedSpring = (toValue: number, config?: object) => {
  return withSpring(toValue, { ...Motion.springs.damped, ...config });
};
