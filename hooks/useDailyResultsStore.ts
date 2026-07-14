import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTodayDateString } from '@/lib/dailySeed';

/**
 * Minimal per-mode daily result blobs, so re-entering a completed daily can
 * restore a rich game-over panel instead of re-dealing the puzzle (the boards
 * themselves are either regenerable from the daily seed or persisted by their
 * own game store — this only keeps the few end-state details that aren't).
 *
 * Rules (mirrors useDailyProgressStore.scoresByMode semantics):
 *  - First write of the local day wins; later writes (Play-Again practice runs
 *    that slip past a screen's daily gate) are ignored.
 *  - Screens must still gate writes to the DAILY run — practice/archive runs
 *    never call setResult.
 *  - Entries silently expire on day rollover; personal data never accumulates.
 */
interface DailyResultsState {
  /** Local day (YYYY-MM-DD) the entries in byMode belong to. */
  date: string;
  byMode: Record<string, unknown>;
}

interface DailyResultsActions {
  /** Record the mode's daily end-state blob (once per local day). */
  setResult: (mode: string, result: unknown) => void;
  /** Today's blob for the mode, or null (other day / never written). */
  getResult: <T>(mode: string) => T | null;
}

type DailyResultsStore = DailyResultsState & DailyResultsActions;

export const useDailyResultsStore = create<DailyResultsStore>()(
  persist(
    (set, get) => ({
      date: getTodayDateString(),
      byMode: {},

      setResult: (mode: string, result: unknown) => {
        const today = getTodayDateString();
        const state = get();
        if (state.date !== today) {
          set({ date: today, byMode: { [mode]: result } });
          return;
        }
        if (mode in state.byMode) return; // first result of the day wins
        set({ byMode: { ...state.byMode, [mode]: result } });
      },

      getResult: <T>(mode: string): T | null => {
        const state = get();
        if (state.date !== getTodayDateString()) return null;
        return (state.byMode[mode] as T | undefined) ?? null;
      },
    }),
    {
      name: 'daily-results-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ date: state.date, byMode: state.byMode }),
    },
  ),
);
