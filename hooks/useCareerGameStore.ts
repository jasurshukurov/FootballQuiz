import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { CareerPlayer, CareerEntry, DifficultyTier } from '@/types/career';
import { getRandomCareerPlayer, getSeededCareerPlayer } from '@/lib/careerData';
import { scrambleCareer, scrambleCareerSeeded, normalizeGuess } from '@/lib/careerHelpers';
import { showRewardedAd } from '@/lib/ads';

const MAX_ATTEMPTS = 3;

interface CareerGameState {
  currentPlayer: CareerPlayer | null;
  scrambledCareer: CareerEntry[];
  unlockedHints: string[];
  guessText: string;
  guessResult: 'none' | 'correct' | 'wrong';
  attemptsLeft: number;
  gameStatus: 'idle' | 'playing' | 'won' | 'lost';
  selectedTier: DifficultyTier | null;

  totalPlayed: number;
  totalWon: number;
  currentStreak: number;
  bestStreak: number;
}

interface CareerGameActions {
  startGame: (tier?: DifficultyTier) => void;
  /** Daily-deterministic start: same seed -> same player and scramble every time. */
  startDailyGame: (seed: number) => void;
  makeGuess: (playerName: string) => void;
  attemptUnlockHint: (hintId: string) => Promise<boolean>;
  resetGame: () => void;
  setGuessText: (text: string) => void;
  giveUp: () => void;
}

type CareerGameStore = CareerGameState & CareerGameActions;

export const isYearsHintLocked = (state: CareerGameState): boolean =>
  !state.unlockedHints.includes('SORT');

export const useCareerGameStore = create<CareerGameStore>()(
  persist(
    (set, get) => ({
      currentPlayer: null,
      scrambledCareer: [],
      unlockedHints: [],
      guessText: '',
      guessResult: 'none',
      attemptsLeft: MAX_ATTEMPTS,
      gameStatus: 'idle',
      selectedTier: null,

      totalPlayed: 0,
      totalWon: 0,
      currentStreak: 0,
      bestStreak: 0,

      startGame: (tier?: DifficultyTier) => {
        const player = getRandomCareerPlayer(tier);
        const scrambled = scrambleCareer(player.career);

        set({
          currentPlayer: player,
          scrambledCareer: scrambled,
          unlockedHints: [],
          guessText: '',
          guessResult: 'none',
          attemptsLeft: MAX_ATTEMPTS,
          gameStatus: 'playing',
          selectedTier: tier ?? null,
        });
      },

      startDailyGame: (seed: number) => {
        const player = getSeededCareerPlayer(seed);
        const scrambled = scrambleCareerSeeded(player.career, seed);

        set({
          currentPlayer: player,
          scrambledCareer: scrambled,
          unlockedHints: [],
          guessText: '',
          guessResult: 'none',
          attemptsLeft: MAX_ATTEMPTS,
          gameStatus: 'playing',
          selectedTier: null,
        });
      },

      makeGuess: (playerName: string) => {
        const state = get();
        if (state.gameStatus !== 'playing' || !state.currentPlayer) return;

        const normalizedGuess = normalizeGuess(playerName);
        const isCorrect =
          normalizedGuess === state.currentPlayer.normalized_name ||
          normalizedGuess === normalizeGuess(state.currentPlayer.name);

        if (isCorrect) {
          const newStreak = state.currentStreak + 1;
          set({
            guessResult: 'correct',
            gameStatus: 'won',
            totalPlayed: state.totalPlayed + 1,
            totalWon: state.totalWon + 1,
            currentStreak: newStreak,
            bestStreak: Math.max(state.bestStreak, newStreak),
          });
        } else {
          const newAttempts = state.attemptsLeft - 1;
          if (newAttempts <= 0) {
            set({
              guessResult: 'wrong',
              attemptsLeft: 0,
              gameStatus: 'lost',
              totalPlayed: state.totalPlayed + 1,
              currentStreak: 0,
            });
          } else {
            set({
              guessResult: 'wrong',
              attemptsLeft: newAttempts,
            });
          }
        }
      },

      attemptUnlockHint: async (hintId: string): Promise<boolean> => {
        const state = get();

        if (state.unlockedHints.includes(hintId)) return false;

        if (hintId === 'YEARS' && !state.unlockedHints.includes('SORT')) {
          return false;
        }

        if (state.unlockedHints.length >= 2) {
          const adResult = await showRewardedAd();
          if (!adResult) return false;
        }

        const newHints = [...state.unlockedHints, hintId];
        const updates: Partial<CareerGameState> = { unlockedHints: newHints };

        if (hintId === 'SORT' && state.currentPlayer) {
          updates.scrambledCareer = [...state.currentPlayer.career];
        }

        set(updates as CareerGameState);
        return true;
      },

      resetGame: () => {
        const { selectedTier } = get();
        const player = getRandomCareerPlayer(selectedTier ?? undefined);
        const scrambled = scrambleCareer(player.career);

        set({
          currentPlayer: player,
          scrambledCareer: scrambled,
          unlockedHints: [],
          guessText: '',
          guessResult: 'none',
          attemptsLeft: MAX_ATTEMPTS,
          gameStatus: 'playing',
          selectedTier: selectedTier,
        });
      },

      setGuessText: (text: string) => {
        set({ guessText: text, guessResult: 'none' });
      },

      giveUp: () => {
        const state = get();
        if (state.gameStatus !== 'playing') return;

        set({
          gameStatus: 'lost',
          attemptsLeft: 0,
          totalPlayed: state.totalPlayed + 1,
          currentStreak: 0,
        });
      },
    }),
    {
      name: 'career-game-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        totalPlayed: state.totalPlayed,
        totalWon: state.totalWon,
        currentStreak: state.currentStreak,
        bestStreak: state.bestStreak,
      }),
    },
  ),
);
