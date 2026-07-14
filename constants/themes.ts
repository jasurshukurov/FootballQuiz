/**
 * Multi-theme engine — v3.
 *
 * Four complete themes sharing ONE TypeScript shape: every theme provides the
 * exact same color tokens (semantic + legacy aliases), gradient stops and
 * shadow recipes as the original Floodlit Pitch palette in constants/theme.ts.
 *
 * Components read the active theme via `useTheme()` (hooks/useTheme.ts) —
 * never import THEMES directly in a component unless you are rendering theme
 * previews (e.g. ThemePicker).
 */

export type ThemeKey = 'floodlit' | 'blackout' | 'daybreak' | 'vintage';

export const DEFAULT_THEME: ThemeKey = 'floodlit';

/** Semantic tokens (v2 names) — the keys migrated components should use. */
interface SemanticColors {
  bgBase: string;
  bgElevated: string;
  bgCard: string;
  bgCardPressed: string;
  /** Translucent overlay behind modals/sheets — finished board stays visible. */
  scrim: string;
  border: string;
  borderStrong: string;

  accent: string;
  accentBright: string;
  accentDim: string;
  accentSoft: string;
  accentBorder: string;

  streak: string;
  streakBright: string;
  streakSoft: string;

  danger: string;
  dangerBright: string;
  dangerSoft: string;
  info: string;

  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textOnAccent: string;
}

/** Legacy v1 aliases — kept so unmigrated files compile on every theme. */
interface LegacyColors {
  pitchGreen: string;
  neonGreen: string;
  offsideRed: string;
  floodlightWhite: string;
  chalkWhite: string;
  cardRed: string;
  cardYellow: string;
  matchGreen: string;
  steelGray: string;
  retroBlack: string;
  midnightNavy: string;
  deepPurple: string;
  broadcasterDark: string;
  glassWhite: string;
  glassBorder: string;
  glassHighlight: string;
  neonGlow: string;
  neonGlowStrong: string;
}

export interface ThemeColors extends SemanticColors, LegacyColors {}

export interface ThemeGradients {
  screenBg: readonly [string, string];
  cardBg: readonly [string, string];
  activeGlow: readonly [string, string];
  headerBg: readonly [string, string];
}

export interface ShadowToken {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

export interface ThemeShadows {
  neonGlow: ShadowToken;
  cardShadow: ShadowToken;
}

export interface Theme {
  key: ThemeKey;
  label: string;
  tagline: string;
  dark: boolean;
  colors: ThemeColors;
  gradients: ThemeGradients;
  shadows: ThemeShadows;
}

/**
 * Derive the legacy alias block from a theme's semantic tokens.
 * `deepPurple` (a third bg step) and `neonGlowStrong` (a louder accent alpha)
 * have no 1:1 semantic equivalent, so each theme supplies them explicitly.
 */
function buildColors(
  semantic: SemanticColors,
  extras: { deepPurple: string; neonGlowStrong: string },
): ThemeColors {
  return {
    ...semantic,
    pitchGreen: semantic.accent,
    neonGreen: semantic.accentBright,
    offsideRed: semantic.danger,
    floodlightWhite: semantic.textPrimary,
    chalkWhite: semantic.textPrimary,
    cardRed: semantic.danger,
    cardYellow: semantic.streak,
    matchGreen: semantic.accent,
    steelGray: semantic.textSecondary,
    retroBlack: semantic.bgBase,
    midnightNavy: semantic.bgElevated,
    deepPurple: extras.deepPurple,
    broadcasterDark: semantic.bgElevated,
    glassWhite: semantic.bgCard,
    glassBorder: semantic.border,
    glassHighlight: semantic.accentSoft,
    neonGlow: semantic.accentBorder,
    neonGlowStrong: extras.neonGlowStrong,
  };
}

function buildShadows(accent: string, dark: boolean): ThemeShadows {
  return {
    neonGlow: {
      shadowColor: accent,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: dark ? 0.35 : 0.25,
      shadowRadius: 12,
      elevation: 8,
    },
    cardShadow: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: dark ? 0.3 : 0.12,
      shadowRadius: 8,
      elevation: 6,
    },
  };
}

// ── 1. Floodlit Night (default) — the original v2 palette, verbatim ────────

const floodlit: Theme = {
  key: 'floodlit',
  label: 'Floodlit Night',
  tagline: 'Champions League night game',
  dark: true,
  colors: buildColors(
    {
      bgBase: '#0A0F0C',
      bgElevated: '#0E1511',
      bgCard: 'rgba(255,255,255,0.045)',
      bgCardPressed: 'rgba(255,255,255,0.09)',
      scrim: 'rgba(10,15,12,0.72)',
      border: 'rgba(255,255,255,0.10)',
      borderStrong: 'rgba(255,255,255,0.18)',

      accent: '#22C55E',
      accentBright: '#4ADE80',
      accentDim: '#16A34A',
      accentSoft: 'rgba(34,197,94,0.14)',
      accentBorder: 'rgba(34,197,94,0.35)',

      streak: '#F59E0B',
      streakBright: '#FBBF24',
      streakSoft: 'rgba(245,158,11,0.14)',

      danger: '#EF4444',
      dangerBright: '#F87171',
      dangerSoft: 'rgba(239,68,68,0.14)',
      info: '#60A5FA',

      textPrimary: '#F4F8F5',
      textSecondary: '#9CA8A0',
      textMuted: '#6F7D74',
      textOnAccent: '#0A0F0C',
    },
    { deepPurple: '#121C16', neonGlowStrong: 'rgba(34,197,94,0.55)' },
  ),
  gradients: {
    screenBg: ['#0A0F0C', '#101A13'],
    cardBg: ['rgba(14,21,17,0.9)', 'rgba(18,28,22,0.9)'],
    activeGlow: ['rgba(34,197,94,0.18)', 'rgba(74,222,128,0.04)'],
    headerBg: ['#0A0F0C', '#0E1511'],
  },
  shadows: buildShadows('#22C55E', true),
};

// ── 2. Blackout — AMOLED near-black with a volt/lime accent ────────────────

const blackout: Theme = {
  key: 'blackout',
  label: 'Blackout',
  tagline: 'AMOLED black, volt accents',
  dark: true,
  colors: buildColors(
    {
      bgBase: '#050706',
      bgElevated: '#0C0F0D',
      bgCard: 'rgba(255,255,255,0.055)',
      bgCardPressed: 'rgba(255,255,255,0.11)',
      scrim: 'rgba(0,0,0,0.78)',
      border: 'rgba(255,255,255,0.10)',
      borderStrong: 'rgba(255,255,255,0.18)',

      accent: '#A3E635',
      accentBright: '#BEF264',
      accentDim: '#84CC16',
      accentSoft: 'rgba(163,230,53,0.14)',
      accentBorder: 'rgba(163,230,53,0.35)',

      streak: '#F59E0B',
      streakBright: '#FBBF24',
      streakSoft: 'rgba(245,158,11,0.14)',

      danger: '#EF4444',
      dangerBright: '#F87171',
      dangerSoft: 'rgba(239,68,68,0.14)',
      info: '#60A5FA',

      textPrimary: '#F5F7F4',
      textSecondary: '#A8B0AA',
      textMuted: '#737B75',
      textOnAccent: '#0A0F0A',
    },
    { deepPurple: '#121513', neonGlowStrong: 'rgba(163,230,53,0.55)' },
  ),
  gradients: {
    screenBg: ['#050706', '#0A0D0B'],
    cardBg: ['rgba(10,13,11,0.9)', 'rgba(14,18,15,0.9)'],
    activeGlow: ['rgba(163,230,53,0.18)', 'rgba(190,242,100,0.04)'],
    headerBg: ['#050706', '#0C0F0D'],
  },
  shadows: buildShadows('#A3E635', true),
};

// ── 3. Daybreak — clean light theme, deep pitch-green accent ───────────────

const daybreak: Theme = {
  key: 'daybreak',
  label: 'Daybreak',
  tagline: 'Sunday morning kick-off',
  dark: false,
  colors: buildColors(
    {
      bgBase: '#F5F6F2',
      bgElevated: '#FFFFFF',
      bgCard: 'rgba(20,32,26,0.05)',
      bgCardPressed: 'rgba(20,32,26,0.10)',
      scrim: 'rgba(23,36,28,0.45)',
      border: 'rgba(20,32,26,0.12)',
      borderStrong: 'rgba(20,32,26,0.22)',

      accent: '#15803D',
      accentBright: '#16A34A',
      accentDim: '#166534',
      accentSoft: 'rgba(21,128,61,0.10)',
      accentBorder: 'rgba(21,128,61,0.30)',

      streak: '#B45309',
      streakBright: '#D97706',
      streakSoft: 'rgba(180,83,9,0.12)',

      // On light themes "bright" is the higher-contrast variant.
      danger: '#DC2626',
      dangerBright: '#B91C1C',
      dangerSoft: 'rgba(220,38,38,0.10)',
      info: '#2563EB',

      textPrimary: '#17241C',
      textSecondary: '#55645B',
      textMuted: '#7B877F',
      textOnAccent: '#FFFFFF',
    },
    { deepPurple: '#E8EDE6', neonGlowStrong: 'rgba(21,128,61,0.50)' },
  ),
  gradients: {
    screenBg: ['#F5F6F2', '#EDF1EA'],
    cardBg: ['rgba(255,255,255,0.92)', 'rgba(250,252,249,0.92)'],
    activeGlow: ['rgba(21,128,61,0.14)', 'rgba(22,163,74,0.03)'],
    headerBg: ['#F5F6F2', '#FFFFFF'],
  },
  shadows: buildShadows('#15803D', false),
};

// ── 4. Vintage Kit — retro paper / Panini-sticker light theme ──────────────

const vintage: Theme = {
  key: 'vintage',
  label: 'Vintage Kit',
  tagline: 'Sticker-album paper & retro green',
  dark: false,
  colors: buildColors(
    {
      bgBase: '#F3ECDC',
      bgElevated: '#FBF6E9',
      bgCard: 'rgba(59,47,32,0.06)',
      bgCardPressed: 'rgba(59,47,32,0.12)',
      scrim: 'rgba(43,36,26,0.45)',
      border: 'rgba(59,47,32,0.16)',
      borderStrong: 'rgba(59,47,32,0.28)',

      accent: '#1B6B45',
      accentBright: '#23855A',
      accentDim: '#145235',
      accentSoft: 'rgba(27,107,69,0.12)',
      accentBorder: 'rgba(27,107,69,0.32)',

      streak: '#C2410C',
      streakBright: '#EA580C',
      streakSoft: 'rgba(194,66,12,0.12)',

      danger: '#B91C1C',
      dangerBright: '#991B1B',
      dangerSoft: 'rgba(185,28,28,0.10)',
      info: '#1D4ED8',

      textPrimary: '#2B241A',
      textSecondary: '#5F5647',
      textMuted: '#857B69',
      textOnAccent: '#FBF6E9',
    },
    { deepPurple: '#E7DDC8', neonGlowStrong: 'rgba(27,107,69,0.50)' },
  ),
  gradients: {
    screenBg: ['#F3ECDC', '#EDE3CD'],
    cardBg: ['rgba(251,246,233,0.92)', 'rgba(245,238,222,0.92)'],
    activeGlow: ['rgba(27,107,69,0.14)', 'rgba(35,133,90,0.03)'],
    headerBg: ['#F3ECDC', '#FBF6E9'],
  },
  shadows: buildShadows('#1B6B45', false),
};

export const THEMES: Record<ThemeKey, Theme> = {
  floodlit,
  blackout,
  daybreak,
  vintage,
};
