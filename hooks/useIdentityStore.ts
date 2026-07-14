import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateUsername, generateUuid } from '@/lib/username';

/**
 * Local-first identity: no login anywhere. A uuid + random football-flavored
 * username are generated once on first launch and persisted. The username is
 * what appears on the global leaderboard; the shuffle action regenerates it.
 *
 * Also holds the day baseline used to derive "XP earned today" for the daily
 * leaderboard: dailyXp = totalXp - xpDayStartTotal while xpDayDate is today.
 * lib/dynamoSync.ts maintains the baseline from manager-store XP deltas.
 */

interface IdentityState {
  userId: string;
  username: string;
  /** Local YYYY-MM-DD the XP baseline belongs to (null until first XP event). */
  xpDayDate: string | null;
  /** totalXp as it stood at the start of xpDayDate. */
  xpDayStartTotal: number;
}

interface IdentityActions {
  /** Regenerate the username. Returns the new name. */
  shuffleUsername: () => string;
  setDayBaseline: (date: string, totalAtDayStart: number) => void;
}

type IdentityStore = IdentityState & IdentityActions;

export const useIdentityStore = create<IdentityStore>()(
  persist(
    (set) => ({
      userId: generateUuid(),
      username: generateUsername(),
      xpDayDate: null,
      xpDayStartTotal: 0,

      shuffleUsername: () => {
        const username = generateUsername();
        set({ username });
        return username;
      },

      setDayBaseline: (date: string, totalAtDayStart: number) =>
        set({ xpDayDate: date, xpDayStartTotal: totalAtDayStart }),
    }),
    {
      name: 'identity-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        userId: state.userId,
        username: state.username,
        xpDayDate: state.xpDayDate,
        xpDayStartTotal: state.xpDayStartTotal,
      }),
      // Keep the freshly generated identity if an older persisted blob is
      // missing fields (defensive: never end up with an empty userId/username).
      merge: (persisted, current) => {
        const stored = (persisted ?? {}) as Partial<IdentityState>;
        return {
          ...current,
          ...stored,
          userId: stored.userId || current.userId,
          username: stored.username || current.username,
        };
      },
    },
  ),
);
