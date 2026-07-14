import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTodayDateString } from '@/lib/dailySeed';

/**
 * Solve-time tracking (NYT-style): per mode per local day, the wall-clock time
 * from the FIRST meaningful interaction (first guess/pick/reveal — never screen
 * mount) to completion. No countdowns anywhere — this is a stopwatch, not
 * pressure.
 *
 * Daily-vs-practice: only the first finalized run of a local day records a
 * time (mirrors useDailyProgressStore's "first score recorded today wins").
 * Same-day Play-Again replays no-op in both markStarted and markCompleted.
 * Archive/practice entries (?practiceDate screens) must simply not call the
 * store — see the isPractice gates in the screens.
 */
export interface SolveTimeEntry {
  /** ms epoch of the first meaningful interaction with today's daily puzzle. */
  startedAt: number;
  /** Finalized first-interaction→completion duration; null while in progress. */
  elapsedMs: number | null;
  /** Whether the finalized run set a new personal best (win-only). */
  isNewBest: boolean;
}

export interface SolveCompletion {
  elapsedMs: number;
  isNewBest: boolean;
}

interface SolveTimeState {
  /** Local day (YYYY-MM-DD) the entries in byMode belong to. */
  date: string;
  byMode: Record<string, SolveTimeEntry>;
  /** Personal best per mode, from DAILY WINS only (ms). */
  bestByMode: Record<string, number>;
}

interface SolveTimeActions {
  /** Start the stopwatch once per mode per day. No-ops if already started or
   *  already finalized today (Play-Again replays). */
  markStarted: (mode: string) => void;
  /**
   * Finalize today's time for the mode. Returns the recorded result, or the
   * previously-recorded one on same-day replays, or null if never started.
   * Pass `countsForBest: false` on losses / streak modes so a fast loss can't
   * become a "personal best".
   */
  markCompleted: (mode: string, options?: { countsForBest?: boolean }) => SolveCompletion | null;
  /** Today's finalized time for the mode, or null. */
  getTodayElapsed: (mode: string) => number | null;
  /** All-time personal best (daily wins only), or null. */
  getBest: (mode: string) => number | null;
}

type SolveTimeStore = SolveTimeState & SolveTimeActions;

function freshEntry(): SolveTimeEntry {
  return { startedAt: Date.now(), elapsedMs: null, isNewBest: false };
}

export const useSolveTimeStore = create<SolveTimeStore>()(
  persist(
    (set, get) => ({
      date: getTodayDateString(),
      byMode: {},
      bestByMode: {},

      markStarted: (mode: string) => {
        const today = getTodayDateString();
        const state = get();
        if (state.date !== today) {
          // New local day: stale entries are dropped, bests are kept.
          set({ date: today, byMode: { [mode]: freshEntry() } });
          return;
        }
        if (state.byMode[mode]) return; // already started (or finalized) today
        set({ byMode: { ...state.byMode, [mode]: freshEntry() } });
      },

      markCompleted: (mode: string, options?: { countsForBest?: boolean }) => {
        const today = getTodayDateString();
        const state = get();
        if (state.date !== today) {
          // Day rolled mid-run (played past midnight): the elapsed time no
          // longer belongs to a coherent daily — drop it rather than record it.
          set({ date: today, byMode: {} });
          return null;
        }
        const entry = state.byMode[mode];
        if (!entry) return null; // completion without a first interaction
        if (entry.elapsedMs != null) {
          // Already finalized today — same-day replay; keep the daily result.
          return { elapsedMs: entry.elapsedMs, isNewBest: entry.isNewBest };
        }
        const elapsedMs = Math.max(0, Date.now() - entry.startedAt);
        const countsForBest = options?.countsForBest ?? true;
        const prevBest = state.bestByMode[mode];
        const isNewBest = countsForBest && (prevBest === undefined || elapsedMs < prevBest);
        set({
          byMode: { ...state.byMode, [mode]: { ...entry, elapsedMs, isNewBest } },
          bestByMode: isNewBest ? { ...state.bestByMode, [mode]: elapsedMs } : state.bestByMode,
        });
        return { elapsedMs, isNewBest };
      },

      getTodayElapsed: (mode: string) => {
        const state = get();
        if (state.date !== getTodayDateString()) return null;
        return state.byMode[mode]?.elapsedMs ?? null;
      },

      getBest: (mode: string) => get().bestByMode[mode] ?? null,
    }),
    {
      name: 'solve-time-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        date: state.date,
        byMode: state.byMode,
        bestByMode: state.bestByMode,
      }),
    },
  ),
);

/** Reactive: today's finalized solve time for a mode, or null. */
export function useTodaySolveTime(mode: string): number | null {
  return useSolveTimeStore((s) =>
    s.date === getTodayDateString() ? (s.byMode[mode]?.elapsedMs ?? null) : null,
  );
}
