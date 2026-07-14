import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { scheduleNextDayReminder } from '@/lib/notifications';
import { useDailyStateStore } from '@/hooks/useDailyStateStore';
import { useRemoteConfigStore } from '@/hooks/useRemoteConfigStore';
import { useSkillStore } from '@/hooks/useSkillStore';
import { getTodayDateString } from '@/lib/dailySeed';

/** The daily mode keys (match DailyMenu keys / markCompleted keys). Kept here so
 *  progress/perfect-day math can exclude remotely-disabled modes.
 *
 *  Deprecated keys (e.g. 'marketmovers') are simply removed from this list:
 *  getCompletedCount filters completedModes through it, so a persisted
 *  completion under a removed key is harmlessly ignored rather than making
 *  the count exceed the total or blocking a perfect day. */
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

// ---------------------------------------------------------------------------
// Skill recording (adaptive difficulty)
// ---------------------------------------------------------------------------
// Each mode's raw markCompleted score, normalized to a 0..1 share for the
// per-mode EWMA skill rating (hooks/useSkillStore). Max scores mirror the
// screens' own scoring semantics:
//   careerpath     attemptsLeft on win, 0 on loss           -> /3 (MAX_ATTEMPTS)
//   grid           correct squares                          -> /9
//   missing11      lineup names found                       -> /11
//   connections    4 - mistakes (win) / solved groups (loss)-> /4
//   agent          correct rounds                           -> /10 (daily rounds)
//   blindranking   scoreRanking points                      -> /10
//   careertimeline hidden clubs guessed                     -> /3 (HIDDEN_COUNT)
//   guessmatch     scoreFor(revealedCount)                  -> /12 (MAX_SCORE)
//   higherlower / marketmovers: unbounded streaks have no clean max — a
//     sustained streak of 10 is treated as a perfect result (soft cap; the
//     recordResult normalization clamps anything above to 1).
//   toplists: list length varies per day (typically a top 10) — normalized
//     against 10 and clamped, so longer lists can't overweight a single day.
const SKILL_MAX_BY_MODE: Record<string, number> = {
  careerpath: 3,
  grid: 9,
  missing11: 11,
  connections: 4,
  higherlower: 10,
  agent: 10,
  blindranking: 10,
  careertimeline: 3,
  // marketmovers stays although deprecated: its screen is dormant but routable,
  // and an unknown key here would silently skip skill recording if revived.
  marketmovers: 10,
  guessmatch: 12,
  toplists: 10,
};

/**
 * Feed a first-of-the-day daily score into the skill store. 'who-are-ya' is
 * the one INVERTED mode (score = guesses used, fewer is better, 0 = loss), so
 * it maps to unused-guess share: 1 guess -> 8/8, 8 guesses -> 1/8, loss -> 0.
 */
function recordSkillResult(mode: string, score: number) {
  if (mode === 'who-are-ya') {
    useSkillStore.getState().recordResult(mode, score <= 0 ? 0 : Math.max(0, 9 - score), 8);
    return;
  }
  const maxScore = SKILL_MAX_BY_MODE[mode];
  if (maxScore === undefined) return; // unknown mode: never guess a scale
  useSkillStore.getState().recordResult(mode, score, maxScore);
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
          // First completion of the day: this is the real daily result, so it
          // (and only it) feeds the adaptive-difficulty skill rating.
          if (score !== undefined) recordSkillResult(mode, score);
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
          // Same first-score-of-the-day guard as scoresByMode: daily results
          // train the skill rating; practice replays never do.
          if (shouldRecordScore) recordSkillResult(mode, score);
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
