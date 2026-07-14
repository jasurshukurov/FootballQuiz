import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_THEME, ThemeKey } from '@/constants/themes';

interface ThemeState {
  themeKey: ThemeKey;
}

interface ThemeActions {
  setTheme: (key: ThemeKey) => void;
}

type ThemeStore = ThemeState & ThemeActions;

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      themeKey: DEFAULT_THEME,

      setTheme: (key: ThemeKey) => set({ themeKey: key }),
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ themeKey: state.themeKey }),
    },
  ),
);
