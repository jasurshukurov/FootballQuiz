import { useSyncExternalStore } from 'react';
import { Platform, useColorScheme } from 'react-native';
import { Theme, ThemeColors } from '@/constants/themes';
import { resolveTheme, useThemeStore } from '@/hooks/useThemeStore';

// ---------------------------------------------------------------------------
// Web hydration guard. The static export bakes every page's markup with the
// default selection resolved against Node's 'light' scheme. If the FIRST
// client render resolves differently (dark-mode phone → dark theme), React
// hydrates against mismatched markup and leaves a mixed light/dark UI until
// something forces a re-render (seen live on iOS: dim text, white tab bar).
// So until the root layout signals hydration is done, useTheme returns the
// exact SSG resolution; the flip re-renders every subscriber with the real
// theme one commit later. Native never defers (starts hydrated).
// ---------------------------------------------------------------------------
let themeHydrated = Platform.OS !== 'web';
const hydrationListeners = new Set<() => void>();

/** Called once by the root layout after mount/hydration (no-op on native). */
export function markThemeHydrated(): void {
  if (themeHydrated) return;
  themeHydrated = true;
  hydrationListeners.forEach((l) => l());
}

function subscribeHydration(cb: () => void): () => void {
  hydrationListeners.add(cb);
  return () => {
    hydrationListeners.delete(cb);
  };
}

function useThemeHydrated(): boolean {
  return useSyncExternalStore(
    subscribeHydration,
    () => themeHydrated,
    // Server snapshot: static rendering always takes the pre-hydration branch.
    () => false,
  );
}

/**
 * The active theme. Re-renders subscribers when the user switches themes AND
 * when the selection is 'system' and the OS light/dark scheme changes
 * (`useColorScheme` is reactive). Screens/components only ever see one of the
 * four real themes — the 'system' selection is resolved away here.
 */
export function useTheme(): Theme {
  const selection = useThemeStore((s) => s.themeKey);
  const scheme = useColorScheme();
  const hydrated = useThemeHydrated();
  // Pre-hydration (web only): match the SSG markup — default selection,
  // 'light' scheme — regardless of the device scheme or persisted choice.
  if (!hydrated) return resolveTheme('system', 'light');
  return resolveTheme(selection, scheme);
}

/** Shortcut for the common case: `const colors = useThemeColors();` */
export function useThemeColors(): ThemeColors {
  return useTheme().colors;
}
