import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerSkillTierProvider, SkillTier } from '@/lib/difficultyCurve';
import { getTodayDateString } from '@/lib/dailySeed';

/**
 * Per-mode skill ratings driving adaptive difficulty: higher daily scores ->
 * harder puzzles, progressively (EWMA), bounded to one difficulty-tier step
 * (lib/difficultyCurve skillAdjustedBand / progressionForRound).
 *
 * Ratings live on a 0..1 scale (normalized score share). Each recorded DAILY
 * result blends in at 30%: rating = 0.7 * rating + 0.3 * clamp(score/maxScore),
 * starting from the neutral prior 0.5 on a mode's first ever result. Practice /
 * Play-Again runs never reach recordResult (useDailyProgressStore only feeds
 * the first daily completion per mode per day).
 *
 * Day-start snapshot: tiers are read from the ratings as they stood BEFORE
 * today's first recorded result. Without this, completing a mode could flip
 * its tier mid-day and regenerate a DIFFERENT "today's puzzle" on the next
 * screen mount. With it, "same user state + same day -> same puzzle" holds all
 * day; today's results shape tomorrow.
 */

const EWMA_KEEP = 0.7;
const EWMA_MIX = 0.3;
/** Rating below this -> tier -1 (easier). */
const TIER_DOWN_BELOW = 0.35;
/** Rating above this -> tier +1 (harder). */
const TIER_UP_ABOVE = 0.75;

function ratingToTier(rating: number | undefined): SkillTier {
  if (rating === undefined || !Number.isFinite(rating)) return 0;
  if (rating < TIER_DOWN_BELOW) return -1;
  if (rating > TIER_UP_ABOVE) return 1;
  return 0;
}

interface SkillState {
  /** mode -> EWMA skill rating 0..1 (all recorded results, including today's). */
  ratings: Record<string, number>;
  /** `ratings` as they stood before the first result recorded on `dayStamp`. */
  dayStartRatings: Record<string, number>;
  /** Local YYYY-MM-DD the snapshot belongs to (null until the first result). */
  dayStamp: string | null;
}

interface SkillActions {
  /**
   * Record a completed DAILY result. `score/maxScore` is clamped to [0, 1]
   * (streak modes pass a soft-cap maxScore, so over-cap streaks count as 1).
   * Invalid input (non-finite, maxScore <= 0) is ignored.
   */
  recordResult: (mode: string, score: number, maxScore: number) => void;
  /** Bounded difficulty tier for a mode, from the day-start snapshot. */
  getSkillTier: (mode: string) => SkillTier;
}

type SkillStore = SkillState & SkillActions;

export const useSkillStore = create<SkillStore>()(
  persist(
    (set, get) => ({
      ratings: {},
      dayStartRatings: {},
      dayStamp: null,

      recordResult: (mode: string, score: number, maxScore: number) => {
        if (!Number.isFinite(score) || !Number.isFinite(maxScore) || maxScore <= 0) return;
        const normalized = Math.min(1, Math.max(0, score / maxScore));
        const state = get();
        const today = getTodayDateString();
        // Roll the day-start snapshot forward on the first result of a new day.
        const dayStartRatings =
          state.dayStamp === today ? state.dayStartRatings : { ...state.ratings };
        const prev = state.ratings[mode] ?? 0.5;
        const next = EWMA_KEEP * prev + EWMA_MIX * normalized;
        set({
          ratings: { ...state.ratings, [mode]: next },
          dayStartRatings,
          dayStamp: today,
        });
      },

      getSkillTier: (mode: string) => {
        const state = get();
        const effective =
          state.dayStamp === getTodayDateString() ? state.dayStartRatings : state.ratings;
        return ratingToTier(effective[mode]);
      },
    }),
    {
      name: 'skill-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        ratings: state.ratings,
        dayStartRatings: state.dayStartRatings,
        dayStamp: state.dayStamp,
      }),
    },
  ),
);

/**
 * Non-React accessor for plain lib code. Safe before hydration (persist
 * rehydrates asynchronously; until then the initial empty state resolves every
 * mode to the neutral tier 0) and safe under any store failure.
 */
export function skillTierForMode(mode: string): SkillTier {
  try {
    return useSkillStore.getState().getSkillTier(mode);
  } catch {
    return 0;
  }
}

// Generators consume tiers via lib/difficultyCurve.resolveSkillTier so lib code
// never imports this (AsyncStorage-backed) module. Loading the store anywhere
// in the app (useDailyProgressStore imports it) makes tiers live.
registerSkillTierProvider(skillTierForMode);
