export const colors = {
  // Core palette
  pitchGreen: '#05F26C',
  neonGreen: '#00FF87',
  offsideRed: '#FF2D55',
  floodlightWhite: '#F0F6FC',
  chalkWhite: '#F5F5F0',
  cardRed: '#E63946',
  cardYellow: '#F4A261',
  matchGreen: '#52B788',
  steelGray: '#6C757D',

  // Neo-Retro Broadcast backgrounds
  retroBlack: '#0A0A1A',
  midnightNavy: '#0D1B2A',
  deepPurple: '#1B0A2E',
  broadcasterDark: '#111128',

  // Glass
  glassWhite: 'rgba(255,255,255,0.08)',
  glassBorder: 'rgba(255,255,255,0.12)',
  glassHighlight: 'rgba(5,242,108,0.15)',

  // Neon glow
  neonGlow: 'rgba(5,242,108,0.4)',
  neonGlowStrong: 'rgba(5,242,108,0.6)',
} as const;

// Gradient presets for expo-linear-gradient
export const gradients = {
  // Main screen background: navy -> midnight purple
  screenBg: ['#0D1B2A', '#1B0A2E'] as const,
  // Subtle card gradient
  cardBg: ['rgba(13,27,42,0.9)', 'rgba(27,10,46,0.9)'] as const,
  // Active/highlighted gradient
  activeGlow: ['rgba(5,242,108,0.2)', 'rgba(0,255,135,0.05)'] as const,
  // Header gradient
  headerBg: ['#0D1B2A', '#111128'] as const,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const borderRadius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
} as const;

export const opacity = {
  glass: 0.08,
  glassBorder: 0.12,
  subtle: 0.5,
  medium: 0.7,
  high: 0.85,
} as const;

export const fonts = {
  heading: 'BarlowCondensed-Bold',
  subheading: 'BarlowCondensed-SemiBold',
  scoreboard: 'SpaceMono-Bold',
  body: 'SpaceMono-Regular',
} as const;

export const shadows = {
  neonGlow: {
    shadowColor: '#05F26C',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  cardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
} as const;
