import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTodayDateString, getYesterdayDateString } from '@/lib/dailySeed';

function getToday(): string {
  return getTodayDateString();
}

function getYesterday(): string {
  return getYesterdayDateString();
}

interface DailyState {
  lastPlayedDate: string | null;
  lastCompletedDate: string | null;
  currentStreak: number;
  maxStreak: number;
  gamesPlayed: number;
  gamesWon: number;
  guessDistribution: number[];
  streakFrozenAvailable: boolean;
  /** Stored so repairStreak knows what to restore */
  previousStreak: number;
}

interface DailyActions {
  checkAndUpdateStreak: () => void;
  /** Marks today as "kept" for the daily streak. Idempotent per day so it can be
   *  called from any completed mode without double-counting. */
  keepStreak: () => void;
  /** Records Who Are Ya-specific win/loss + guess distribution stats. */
  recordCompletion: (won: boolean, guessCount: number) => void;
  repairStreak: () => void;
}

type DailyStore = DailyState & DailyActions;

export const useDailyStateStore = create<DailyStore>()(
  persist(
    (set, get) => ({
      lastPlayedDate: null,
      lastCompletedDate: null,
      currentStreak: 0,
      maxStreak: 0,
      gamesPlayed: 0,
      gamesWon: 0,
      guessDistribution: [0, 0, 0, 0, 0, 0, 0, 0],
      streakFrozenAvailable: false,
      previousStreak: 0,

      checkAndUpdateStreak: () => {
        const { lastCompletedDate, currentStreak } = get();
        const today = getToday();
        const yesterday = getYesterday();

        if (!lastCompletedDate) return;
        if (lastCompletedDate === today || lastCompletedDate === yesterday) return;

        // Missed a day - break the streak
        set({
          previousStreak: currentStreak,
          currentStreak: 0,
          streakFrozenAvailable: true,
        });
      },

      keepStreak: () => {
        const state = get();
        const today = getToday();
        const yesterday = getYesterday();

        // Already counted today - streak is a once-per-day event.
        if (state.lastCompletedDate === today) return;

        const newStreak = state.lastCompletedDate === yesterday ? state.currentStreak + 1 : 1;

        set({
          lastPlayedDate: today,
          lastCompletedDate: today,
          currentStreak: newStreak,
          maxStreak: Math.max(newStreak, state.maxStreak),
        });
      },

      recordCompletion: (won: boolean, guessCount: number) => {
        const state = get();

        const newDistribution = [...state.guessDistribution];
        if (won && guessCount >= 1 && guessCount <= 8) {
          newDistribution[guessCount - 1]++;
        }

        set({
          gamesPlayed: state.gamesPlayed + 1,
          gamesWon: won ? state.gamesWon + 1 : state.gamesWon,
          guessDistribution: newDistribution,
        });
      },

      repairStreak: () => {
        const { streakFrozenAvailable, previousStreak } = get();
        if (!streakFrozenAvailable) return;
        set({
          currentStreak: previousStreak,
          maxStreak: Math.max(previousStreak, get().maxStreak),
          streakFrozenAvailable: false,
        });
      },
    }),
    {
      name: 'daily-state-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        lastPlayedDate: state.lastPlayedDate,
        lastCompletedDate: state.lastCompletedDate,
        currentStreak: state.currentStreak,
        maxStreak: state.maxStreak,
        gamesPlayed: state.gamesPlayed,
        gamesWon: state.gamesWon,
        guessDistribution: state.guessDistribution,
        streakFrozenAvailable: state.streakFrozenAvailable,
        previousStreak: state.previousStreak,
      }),
    },
  ),
);

/** Standalone function for use outside of React components (e.g. from useGuessGameStore) */
export function recordGameCompletion(won: boolean, guessCount: number) {
  useDailyStateStore.getState().recordCompletion(won, guessCount);
}
