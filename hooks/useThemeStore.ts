import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_THEME, THEMES, Theme, ThemeKey } from '@/constants/themes';

/**
 * What the user has *selected*. Either an explicit theme, or the literal
 * 'system' which means "follow the device light/dark scheme". The resolved,
 * concrete theme (always one of the real {@link ThemeKey}s) is derived at read
 * time in useTheme.ts — screens/components never see 'system'.
 */
export type ThemeSelection = ThemeKey | 'system';

/**
 * New installs get the dark default theme regardless of the device scheme
 * (owner decision 2026-07-17: OS-light rendering surfaced real visual bugs;
 * dark is the designed-first experience). Following the device stays
 * available as the explicit "Match device" choice in the theme picker.
 */
export const DEFAULT_SELECTION: ThemeSelection = DEFAULT_THEME;

/** Concrete themes the OS scheme maps to when the selection is 'system'. */
export const SYSTEM_DARK_THEME: ThemeKey = 'floodlit';
export const SYSTEM_LIGHT_THEME: ThemeKey = 'daybreak';

/**
 * Resolve a persisted selection + OS color scheme to a concrete Theme.
 * 'system' follows the device (dark → floodlit, light → daybreak); any explicit
 * key is used as-is, falling back to the default theme if it is stale/unknown.
 * Pure (no react-native import) so it is unit-testable under the node env.
 */
export function resolveTheme(
  selection: ThemeSelection,
  scheme: 'light' | 'dark' | null | undefined,
): Theme {
  if (selection === 'system') {
    return scheme === 'light' ? THEMES[SYSTEM_LIGHT_THEME] : THEMES[SYSTEM_DARK_THEME];
  }
  return THEMES[selection as ThemeKey] ?? THEMES[DEFAULT_THEME];
}

interface ThemeState {
  themeKey: ThemeSelection;
}

interface ThemeActions {
  setTheme: (key: ThemeSelection) => void;
}

type ThemeStore = ThemeState & ThemeActions;

/**
 * v0/v1 → v2 migration. Explicit theme keys carry forward UNCHANGED — a user
 * who picked a theme keeps it. A persisted 'system' is migrated to the dark
 * default: it was the pre-v2 install default, not a deliberate choice for the
 * overwhelming majority, and the owner treats OS-light-by-default as a bug.
 * Anyone who wants OS-following back re-picks "Match device" in settings.
 */
export function migrateThemeStore(persisted: unknown): ThemeState {
  const prev = persisted as Partial<ThemeState> | null | undefined;
  if (prev && typeof prev.themeKey === 'string' && prev.themeKey !== 'system') {
    return { themeKey: prev.themeKey as ThemeSelection };
  }
  return { themeKey: DEFAULT_SELECTION };
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      themeKey: DEFAULT_SELECTION,

      setTheme: (key: ThemeSelection) => set({ themeKey: key }),
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,
      migrate: (persistedState) => migrateThemeStore(persistedState),
      partialize: (state) => ({ themeKey: state.themeKey }),
    },
  ),
);
