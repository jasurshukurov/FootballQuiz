import { DEFAULT_THEME, THEMES, Theme, ThemeColors } from '@/constants/themes';
import { useThemeStore } from '@/hooks/useThemeStore';

/**
 * The active theme. Re-renders subscribers when the user switches themes.
 * Falls back to the default theme if a stale/unknown key was persisted.
 */
export function useTheme(): Theme {
  const themeKey = useThemeStore((s) => s.themeKey);
  return THEMES[themeKey] ?? THEMES[DEFAULT_THEME];
}

/** Shortcut for the common case: `const colors = useThemeColors();` */
export function useThemeColors(): ThemeColors {
  return useTheme().colors;
}
