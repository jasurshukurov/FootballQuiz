import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ManagerLevel, getLevelForXp, getProgressToNextLevel } from '@/lib/managerLevels';
import { syncManagerProfile } from '@/lib/dynamoSync';

interface ManagerState {
  totalXp: number;
  xpByMode: Record<string, number>;
  gamesCompletedByMode: Record<string, number>;
  lastSyncedAt: string | null;
}

interface ManagerActions {
  addXp: (mode: string, amount: number) => void;
  getLevel: () => ManagerLevel;
  getProgress: () => { current: number; next: number; progress: number };
  syncToCloud: () => Promise<void>;
}

type ManagerStore = ManagerState & ManagerActions;

export const useManagerStore = create<ManagerStore>()(
  persist(
    (set, get) => ({
      totalXp: 0,
      xpByMode: {},
      gamesCompletedByMode: {},
      lastSyncedAt: null,

      addXp: (mode: string, amount: number) => {
        if (amount <= 0) return;
        const state = get();
        set({
          totalXp: state.totalXp + amount,
          xpByMode: {
            ...state.xpByMode,
            [mode]: (state.xpByMode[mode] ?? 0) + amount,
          },
          gamesCompletedByMode: {
            ...state.gamesCompletedByMode,
            [mode]: (state.gamesCompletedByMode[mode] ?? 0) + 1,
          },
        });
      },

      getLevel: () => getLevelForXp(get().totalXp),

      getProgress: () => getProgressToNextLevel(get().totalXp),

      syncToCloud: async () => {
        const state = get();
        await syncManagerProfile({
          totalXp: state.totalXp,
          xpByMode: state.xpByMode,
          gamesCompletedByMode: state.gamesCompletedByMode,
          lastSyncedAt: state.lastSyncedAt,
        });
        set({ lastSyncedAt: new Date().toISOString() });
      },
    }),
    {
      name: 'manager-profile-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        totalXp: state.totalXp,
        xpByMode: state.xpByMode,
        gamesCompletedByMode: state.gamesCompletedByMode,
        lastSyncedAt: state.lastSyncedAt,
      }),
    },
  ),
);
