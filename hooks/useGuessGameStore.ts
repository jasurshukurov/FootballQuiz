import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Player } from '@/types/player';
import { GuessResult, GameStatus } from '@/types/game';
import { comparePlayers } from '@/lib/comparePlayers';
import { getDailyTarget, getDailyNumber, getRandomTarget } from '@/lib/dailyPuzzle';
import { recordGameCompletion } from '@/hooks/useDailyStateStore';

const MAX_GUESSES = 8;

interface GuessGameState {
  dailyNumber: number;
  targetPlayer: Player | null;
  guesses: GuessResult[];
  gameStatus: GameStatus;
  maxGuesses: number;
  /** True while playing a past day from the archive — never persisted, and
   *  suppresses stats/streak recording. */
  isPractice: boolean;
}

interface GuessGameActions {
  initGame: () => void;
  /** Load a past day's puzzle for practice (archive). Does not record stats. */
  initPracticeGame: (dateStr: string) => void;
  makeGuess: (player: Player) => GuessResult | null;
  giveUp: () => void;
  resetGame: () => void;
}

type GuessGameStore = GuessGameState & GuessGameActions;

export const useGuessGameStore = create<GuessGameStore>()(
  persist(
    (set, get) => ({
      dailyNumber: -1,
      targetPlayer: null,
      guesses: [],
      gameStatus: 'playing' as GameStatus,
      maxGuesses: MAX_GUESSES,
      isPractice: false,

      initGame: () => {
        const today = getDailyNumber();
        const state = get();

        // Re-init if not already on today's daily, OR if we're leaving a
        // practice board (which had a different dailyNumber anyway).
        if (state.dailyNumber === today && state.targetPlayer && !state.isPractice) {
          return;
        }

        const target = getDailyTarget();
        set({
          dailyNumber: today,
          targetPlayer: target,
          guesses: [],
          gameStatus: 'playing',
          isPractice: false,
        });
      },

      initPracticeGame: (dateStr: string) => {
        const date = new Date(`${dateStr}T00:00:00`);
        set({
          dailyNumber: getDailyNumber(date),
          targetPlayer: getDailyTarget(date),
          guesses: [],
          gameStatus: 'playing',
          isPractice: true,
        });
      },

      makeGuess: (player: Player) => {
        const state = get();
        if (state.gameStatus !== 'playing' || !state.targetPlayer) return null;

        const alreadyGuessed = state.guesses.some((g) => g.player.id === player.id);
        if (alreadyGuessed) return null;

        const result = comparePlayers(player, state.targetPlayer);
        const newGuesses = [...state.guesses, result];

        let newStatus: GameStatus = 'playing';
        if (result.isCorrect) {
          newStatus = 'won';
        } else if (newGuesses.length >= MAX_GUESSES) {
          newStatus = 'lost';
        }

        set({
          guesses: newGuesses,
          gameStatus: newStatus,
        });

        if ((newStatus === 'won' || newStatus === 'lost') && !state.isPractice) {
          recordGameCompletion(newStatus === 'won', newGuesses.length);
        }

        return result;
      },

      giveUp: () => {
        const state = get();
        if (state.gameStatus !== 'playing') return;

        set({ gameStatus: 'lost' });
        if (!state.isPractice) {
          recordGameCompletion(false, state.guesses.length);
        }
      },

      resetGame: () => {
        const target = getRandomTarget();
        set({
          dailyNumber: getDailyNumber(),
          targetPlayer: target,
          guesses: [],
          gameStatus: 'playing',
        });
      },
    }),
    {
      name: 'guess-game-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        dailyNumber: state.dailyNumber,
        targetPlayer: state.targetPlayer,
        guesses: state.guesses,
        gameStatus: state.gameStatus,
      }),
    },
  ),
);
