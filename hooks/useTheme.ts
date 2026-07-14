import { useColorScheme } from 'react-native';
import { Theme, ThemeColors } from '@/constants/themes';
import { resolveTheme, useThemeStore } from '@/hooks/useThemeStore';

/**
 * The active theme. Re-renders subscribers when the user switches themes AND
 * when the selection is 'system' and the OS light/dark scheme changes
 * (`useColorScheme` is reactive). Screens/components only ever see one of the
 * four real themes — the 'system' selection is resolved away here.
 */
export function useTheme(): Theme {
  const selection = useThemeStore((s) => s.themeKey);
  const scheme = useColorScheme();
  return resolveTheme(selection, scheme);
}

/** Shortcut for the common case: `const colors = useThemeColors();` */
export function useThemeColors(): ThemeColors {
  return useTheme().colors;
}
