import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOTAL_MODES = 9;

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

interface DailyProgressState {
  date: string;
  completedModes: Record<string, boolean>;
  scoresByMode: Record<string, number>;
}

interface DailyProgressActions {
  checkAndResetForNewDay: () => void;
  markCompleted: (mode: string, score?: number) => void;
  isCompleted: (mode: string) => boolean;
  getCompletedCount: () => number;
  getTotalModes: () => number;
}

type DailyProgressStore = DailyProgressState & DailyProgressActions;

export const useDailyProgressStore = create<DailyProgressStore>()(
  persist(
    (set, get) => ({
      date: getToday(),
      completedModes: {},
      scoresByMode: {},

      checkAndResetForNewDay: () => {
        const today = getToday();
        if (get().date !== today) {
          set({
            date: today,
            completedModes: {},
            scoresByMode: {},
          });
        }
      },

      markCompleted: (mode: string, score?: number) => {
        const state = get();
        const today = getToday();
        if (state.date !== today) {
          set({
            date: today,
            completedModes: { [mode]: true },
            scoresByMode: score !== undefined ? { [mode]: score } : {},
          });
        } else {
          set({
            completedModes: { ...state.completedModes, [mode]: true },
            scoresByMode:
              score !== undefined
                ? { ...state.scoresByMode, [mode]: score }
                : state.scoresByMode,
          });
        }
      },

      isCompleted: (mode: string) => {
        const state = get();
        if (state.date !== getToday()) return false;
        return !!state.completedModes[mode];
      },

      getCompletedCount: () => {
        const state = get();
        if (state.date !== getToday()) return 0;
        return Object.values(state.completedModes).filter(Boolean).length;
      },

      getTotalModes: () => TOTAL_MODES,
    }),
    {
      name: 'daily-progress-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        date: state.date,
        completedModes: state.completedModes,
        scoresByMode: state.scoresByMode,
      }),
    },
  ),
);
