// src/constants/theme.ts
export const Colors = {
  background: '#f8f0d8', // Fondo crema cálido principal
  inputBackground: '#f0e6c4', // Fondo de inputs (crema más oscuro)
  inputFocus: '#f8f0d8', // Fondo al enfocar (para dar profundidad)
  primaryButton: '#283618', // Botón principal (black_forest)
  accent: '#bc6c25', // Acentos y links (copperwood)
  textPrimary: '#1a2410', // Textos en verde muy oscuro
  textSecondary: '#283618', // Textos secundarios en verde bosque
  error: '#d9534f', // Rojo para errores
  
  // Status colors para las impresoras (se mantienen del rediseño)
  statusOperativa:  '#00d4a1',   // Teal — Operational
  statusMantenim:   '#f59e0b',   // Amber — In maintenance
  statusFuera:      '#ef4444',   // Red — Out of service
  statusUnknown:    '#6b7280',   // Gray — Unknown

  // Alias para la Home Rediseñada
  surfaceBase: '#ffffff',
  surfaceBorder: '#e6d8b8',
  surfaceElevated: '#f0e6c4',
  primaryGlow: '#e8dcba',
  primary: '#283618',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const Radius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 20,
};

export const Typography = {
  labelMono: {
    fontFamily: 'Courier New',
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
  },
};
