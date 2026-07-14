/**
 * "Floodlit Pitch" design system — v2 tokens, v3 theming.
 *
 * Layers:
 *   1. themes    — constants/themes.ts owns all color/gradient/shadow values
 *                  (four themes); components read them via useTheme()
 *   2. colors    — STATIC floodlit fallback (see note below)
 *   3. type      — the ONLY sanctioned font sizes/line heights
 *   4. spacing / radius / motion / touch — theme-independent constants
 *
 * NOTE (v3): the static `colors` / `gradients` / `shadows` exports below are
 * the floodlit fallback — components must use useTheme() instead; only
 * non-React code (share-text builders, scripts, notifications) may import
 * these static exports.
 */

import { THEMES } from '@/constants/themes';

/** @deprecated in components — use `useTheme().colors`. Floodlit fallback. */
export const colors = THEMES.floodlit.colors;

/** @deprecated in components — use `useTheme().gradients`. Floodlit fallback. */
export const gradients = THEMES.floodlit.gradients;

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
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  full: 9999,
} as const;

export const opacity = {
  glass: 0.045,
  glassBorder: 0.1,
  subtle: 0.5,
  medium: 0.7,
  high: 0.85,
} as const;

export const fonts = {
  // Display / headlines — condensed, "shirt numbering" feel
  heading: 'BarlowCondensed-Bold',
  subheading: 'BarlowCondensed-SemiBold',
  // Numbers, scores, share-text — monospace keeps columns aligned
  scoreboard: 'SpaceMono-Bold',
  mono: 'SpaceMono-Regular',
  // UI text — Inter
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
} as const;

/**
 * Typography scale — the only sanctioned fontSize/lineHeight pairs.
 * Usage: <Text style={type.h2}> or spread into StyleSheet entries.
 */
export const type = {
  display: { fontFamily: fonts.heading, fontSize: 40, lineHeight: 44, letterSpacing: 0.5 },
  h1: { fontFamily: fonts.heading, fontSize: 28, lineHeight: 32, letterSpacing: 0.5 },
  h2: { fontFamily: fonts.subheading, fontSize: 22, lineHeight: 26, letterSpacing: 0.3 },
  h3: { fontFamily: fonts.subheading, fontSize: 18, lineHeight: 22, letterSpacing: 0.3 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21 },
  bodyBold: { fontFamily: fonts.bodySemiBold, fontSize: 15, lineHeight: 21 },
  caption: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  captionBold: { fontFamily: fonts.bodyMedium, fontSize: 13, lineHeight: 18 },
  micro: { fontFamily: fonts.bodyMedium, fontSize: 11, lineHeight: 14, letterSpacing: 0.4 },
  score: { fontFamily: fonts.scoreboard, fontSize: 18, lineHeight: 24 },
  scoreLarge: { fontFamily: fonts.scoreboard, fontSize: 28, lineHeight: 34 },
} as const;

/** @deprecated in components — use `useTheme().shadows`. Floodlit fallback. */
export const shadows = THEMES.floodlit.shadows;

/** Motion constants — one vocabulary of durations/springs app-wide. */
export const motion = {
  fast: 150,
  base: 250,
  slow: 400,
  spring: { damping: 50, stiffness: 400 }, // reveal/settle
  // Softened from damping 14 — visible overshoot reads as "jumping" (user
  // feedback). Near-critical settle; reserve real bounce for Confetti only.
  springBouncy: { damping: 26, stiffness: 220 },
} as const;

/** Minimum touch target (pt). Primary CTAs should be 56+. */
export const touch = {
  min: 44,
  cta: 56,
} as const;
