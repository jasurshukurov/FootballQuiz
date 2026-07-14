import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { CareerPlayer, CareerEntry, DifficultyTier } from '@/types/career';
import { getRandomCareerPlayer, getSeededCareerPlayer } from '@/lib/careerData';
import {
  scrambleCareer,
  scrambleCareerSeeded,
  normalizeGuess,
  computeProximity,
  ProximityChips,
} from '@/lib/careerHelpers';
import { showRewardedAd } from '@/lib/ads';

const MAX_ATTEMPTS = 3;

interface CareerGameState {
  currentPlayer: CareerPlayer | null;
  scrambledCareer: CareerEntry[];
  unlockedHints: string[];
  guessText: string;
  guessResult: 'none' | 'correct' | 'wrong';
  /** Proximity chips for the most recent wrong guess (guess vs answer). */
  lastProximity: ProximityChips | null;
  attemptsLeft: number;
  gameStatus: 'idle' | 'playing' | 'won' | 'lost';
  selectedTier: DifficultyTier | null;
  /** Seed of the daily board currently held (null for practice/free-play).
   *  Persisted so re-entering a finished daily restores the board instead of
   *  re-dealing it (startDailyGame guards on it). */
  dailySeed: number | null;
  /** True while on a Play-Again/free-play board. NOT persisted: on the next
   *  app open it resets to false so startDailyGame's guard can't mistake a
   *  practice board (dailySeed null) for the official daily. */
  isPractice: boolean;

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
      lastProximity: null,
      attemptsLeft: MAX_ATTEMPTS,
      gameStatus: 'idle',
      selectedTier: null,
      dailySeed: null,
      isPractice: false,

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
          lastProximity: null,
          attemptsLeft: MAX_ATTEMPTS,
          gameStatus: 'playing',
          selectedTier: tier ?? null,
          dailySeed: null,
          isPractice: true,
        });
      },

      startDailyGame: (seed: number) => {
        // Re-entry guard: if the persisted board IS today's daily (finished or
        // mid-run), keep it — never re-deal a fresh daily on mount. A practice
        // board (isPractice) never matches, so leaving mid-practice falls
        // through and restores the real daily.
        const state = get();
        if (state.dailySeed === seed && state.currentPlayer && !state.isPractice) {
          return;
        }

        const player = getSeededCareerPlayer(seed);
        const scrambled = scrambleCareerSeeded(player.career, seed);

        set({
          currentPlayer: player,
          scrambledCareer: scrambled,
          unlockedHints: [],
          guessText: '',
          guessResult: 'none',
          lastProximity: null,
          attemptsLeft: MAX_ATTEMPTS,
          gameStatus: 'playing',
          selectedTier: null,
          dailySeed: seed,
          isPractice: false,
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
            lastProximity: null,
            gameStatus: 'won',
            totalPlayed: state.totalPlayed + 1,
            totalWon: state.totalWon + 1,
            currentStreak: newStreak,
            bestStreak: Math.max(state.bestStreak, newStreak),
          });
        } else {
          // Teach on every miss: chips comparing the guess to the answer.
          const proximity = computeProximity(playerName, state.currentPlayer);
          const newAttempts = state.attemptsLeft - 1;
          if (newAttempts <= 0) {
            set({
              guessResult: 'wrong',
              lastProximity: proximity,
              attemptsLeft: 0,
              gameStatus: 'lost',
              totalPlayed: state.totalPlayed + 1,
              currentStreak: 0,
            });
          } else {
            set({
              guessResult: 'wrong',
              lastProximity: proximity,
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
        // "Next Player" is a PRACTICE replay, never a second run at the daily.
        // dailySeed is cleared (and isPractice isn't persisted), so the next
        // mount's startDailyGame restores/deals the true daily instead of
        // mistaking this random practice board for it.
        const { selectedTier } = get();
        const player = getRandomCareerPlayer(selectedTier ?? undefined);
        const scrambled = scrambleCareer(player.career);

        set({
          currentPlayer: player,
          scrambledCareer: scrambled,
          unlockedHints: [],
          guessText: '',
          guessResult: 'none',
          lastProximity: null,
          attemptsLeft: MAX_ATTEMPTS,
          gameStatus: 'playing',
          selectedTier: selectedTier,
          dailySeed: null,
          isPractice: true,
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
        // Daily-board restoration (additive): a full reload lands back on the
        // same board — finished dailies show their result, mid-runs keep their
        // attempts/hints. isPractice and guessText stay transient by design.
        currentPlayer: state.currentPlayer,
        scrambledCareer: state.scrambledCareer,
        unlockedHints: state.unlockedHints,
        guessResult: state.guessResult,
        lastProximity: state.lastProximity,
        attemptsLeft: state.attemptsLeft,
        gameStatus: state.gameStatus,
        dailySeed: state.dailySeed,
      }),
    },
  ),
);
