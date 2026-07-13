import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { scheduleNextDayReminder } from '@/lib/notifications';
import { useDailyStateStore } from '@/hooks/useDailyStateStore';
import { useRemoteConfigStore } from '@/hooks/useRemoteConfigStore';
import { getTodayDateString } from '@/lib/dailySeed';

/** The daily mode keys (match DailyMenu keys / markCompleted keys). Kept here so
 *  progress/perfect-day math can exclude remotely-disabled modes. */
const DAILY_MODE_KEYS = [
  'careerpath',
  'who-are-ya',
  'grid',
  'missing11',
  'connections',
  'higherlower',
  'agent',
  'blindranking',
  'careertimeline',
  'marketmovers',
  'guessmatch',
  'toplists',
];

/** The daily modes that are currently playable (not in disabled_modes). */
function activeModeKeys(): string[] {
  const disabled = useRemoteConfigStore.getState().config.disabled_modes;
  return DAILY_MODE_KEYS.filter((k) => !disabled.includes(k));
}

function getToday(): string {
  return getTodayDateString();
}

interface DailyProgressState {
  date: string;
  completedModes: Record<string, boolean>;
  scoresByMode: Record<string, number>;
  /** Lifetime count of days where every mode was completed. */
  perfectDays: number;
  /** The date the most recent perfect day was recorded (guards double-count). */
  lastPerfectDate: string | null;
}

interface DailyProgressActions {
  checkAndResetForNewDay: () => void;
  markCompleted: (mode: string, score?: number) => void;
  isCompleted: (mode: string) => boolean;
  getCompletedCount: () => number;
  getTotalModes: () => number;
  /** Records today as a perfect day exactly once. Returns true if it just
   *  counted (so the UI can celebrate), false if already counted today. */
  recordPerfectDay: () => boolean;
}

type DailyProgressStore = DailyProgressState & DailyProgressActions;

export const useDailyProgressStore = create<DailyProgressStore>()(
  persist(
    (set, get) => ({
      date: getToday(),
      completedModes: {},
      scoresByMode: {},
      perfectDays: 0,
      lastPerfectDate: null,

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
          // Screens call markCompleted on every game end, including post-completion
          // "Play Again" practice runs. Keep the FIRST score recorded today so a
          // practice run can't overwrite the real daily score. Re-marking the mode
          // completed is harmless.
          const alreadyCompleted = !!state.completedModes[mode];
          const shouldRecordScore =
            score !== undefined && !(alreadyCompleted && mode in state.scoresByMode);
          set({
            completedModes: { ...state.completedModes, [mode]: true },
            scoresByMode: shouldRecordScore
              ? { ...state.scoresByMode, [mode]: score }
              : state.scoresByMode,
          });
        }

        // Completing ANY daily mode keeps the overall daily streak alive.
        // keepStreak is idempotent per day, so multiple mode completions
        // (or Who Are Ya also recording its own stats) won't double-count.
        useDailyStateStore.getState().keepStreak();

        // Schedule next-day reminder after completing a mode
        const streak = useDailyStateStore.getState().currentStreak;
        scheduleNextDayReminder(streak).catch(() => {});
      },

      isCompleted: (mode: string) => {
        const state = get();
        if (state.date !== getToday()) return false;
        return !!state.completedModes[mode];
      },

      getCompletedCount: () => {
        const state = get();
        if (state.date !== getToday()) return 0;
        // Only count active (non-disabled) daily modes so a remotely-disabled
        // mode never makes the count exceed the total.
        return activeModeKeys().filter((k) => state.completedModes[k]).length;
      },

      getTotalModes: () => activeModeKeys().length,

      recordPerfectDay: () => {
        const state = get();
        const today = getToday();
        if (state.lastPerfectDate === today) return false;
        set({ perfectDays: state.perfectDays + 1, lastPerfectDate: today });
        return true;
      },
    }),
    {
      name: 'daily-progress-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        date: state.date,
        completedModes: state.completedModes,
        scoresByMode: state.scoresByMode,
        perfectDays: state.perfectDays,
        lastPerfectDate: state.lastPerfectDate,
      }),
    },
  ),
);
