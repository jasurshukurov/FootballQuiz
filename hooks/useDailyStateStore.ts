import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
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

      recordCompletion: (won: boolean, guessCount: number) => {
        const state = get();
        const today = getToday();
        const yesterday = getYesterday();

        const newGamesPlayed = state.gamesPlayed + 1;
        const newGamesWon = won ? state.gamesWon + 1 : state.gamesWon;

        const newDistribution = [...state.guessDistribution];
        if (won && guessCount >= 1 && guessCount <= 8) {
          newDistribution[guessCount - 1]++;
        }

        let newStreak: number;
        if (state.lastCompletedDate === yesterday) {
          newStreak = state.currentStreak + 1;
        } else if (state.lastCompletedDate === today) {
          // Already recorded today, no change
          newStreak = state.currentStreak;
        } else {
          newStreak = 1;
        }

        set({
          lastPlayedDate: today,
          lastCompletedDate: today,
          gamesPlayed: newGamesPlayed,
          gamesWon: newGamesWon,
          guessDistribution: newDistribution,
          currentStreak: newStreak,
          maxStreak: Math.max(newStreak, state.maxStreak),
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
