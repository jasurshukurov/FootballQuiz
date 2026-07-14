import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SkillTier } from '@/lib/difficultyCurve';

/**
 * The Grid's own daily board persistence: today's placed answers are stored
 * additively so leaving mid-game (or after finishing) and coming back restores
 * the exact board + result panel. Practice/archive runs and same-day
 * "Play Again" replays never touch this store — only the real daily run does.
 */

export interface GridPlacement {
  playerId: number;
  playerName: string;
  /** Fame at pick time drove the deep-cut chip; persisted so the restored
   *  board renders identically. */
  deepCut: boolean;
}

interface GridGameState {
  /** Local day (YYYY-MM-DD) this board belongs to. */
  date: string;
  /** DailyGrid.id the placements were made against. An engine/tier change
   *  regenerates a different id and safely invalidates the stored board. */
  gridId: string | null;
  /** Skill tier locked at the day's first render, so completing the daily
   *  (which trains the skill rating) can't regenerate a different grid on
   *  re-entry the same day. */
  tier: SkillTier | null;
  /** Correct answers only, keyed "row-col". */
  placements: Record<string, GridPlacement>;
  /** Players placed CORRECTLY — each fills exactly one square, so they can't be
   *  reused elsewhere on the board. */
  usedPlayerIds: number[];
  /** Wrong guesses tracked per cell ("row-col" -> playerIds). A wrong pick
   *  costs a guess but leaves the square open; the same player can't be wasted
   *  on that square again, yet may still be a valid answer for a DIFFERENT one. */
  wrongByCell: Record<string, number[]>;
  guessesUsed: number;
  points: number;
  hintsUsed: number;
}

interface GridGameActions {
  /** Bind today's board. Resets state when the day or grid changed. */
  bindDaily: (date: string, gridId: string, tier: SkillTier) => void;
  /** Reserve the tier for the day (call before generating the grid). */
  lockTier: (date: string, tier: SkillTier) => SkillTier;
  recordCorrect: (cellKey: string, placement: GridPlacement, pointsEarned: number) => void;
  recordWrong: (cellKey: string, playerId: number) => void;
  recordHint: () => void;
}

type GridGameStore = GridGameState & GridGameActions;

const emptyDay = (date: string): GridGameState => ({
  date,
  gridId: null,
  tier: null,
  placements: {},
  usedPlayerIds: [],
  wrongByCell: {},
  guessesUsed: 0,
  points: 0,
  hintsUsed: 0,
});

export const useGridGameStore = create<GridGameStore>()(
  persist(
    (set, get) => ({
      ...emptyDay(''),

      lockTier: (date, tier) => {
        const s = get();
        if (s.date === date && s.tier !== null) return s.tier;
        set({ ...emptyDay(date), tier });
        return tier;
      },

      bindDaily: (date, gridId, tier) => {
        const s = get();
        if (s.date === date && s.gridId === gridId) return; // resume as-is
        set({ ...emptyDay(date), gridId, tier });
      },

      recordCorrect: (cellKey, placement, pointsEarned) => {
        const s = get();
        set({
          placements: { ...s.placements, [cellKey]: placement },
          usedPlayerIds: [...s.usedPlayerIds, placement.playerId],
          guessesUsed: s.guessesUsed + 1,
          points: s.points + pointsEarned,
        });
      },

      recordWrong: (cellKey, playerId) => {
        const s = get();
        const already = s.wrongByCell[cellKey] ?? [];
        if (already.includes(playerId)) return; // duplicate — no guess spent
        set({
          wrongByCell: { ...s.wrongByCell, [cellKey]: [...already, playerId] },
          guessesUsed: s.guessesUsed + 1,
        });
      },

      recordHint: () => set({ hintsUsed: get().hintsUsed + 1 }),
    }),
    {
      name: 'grid-game-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
