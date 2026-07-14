import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface TutorialState {
  seenTutorials: Record<string, boolean>;
  /**
   * True once AsyncStorage rehydration has finished. The how-to-play sheet
   * only AUTO-shows after hydration — otherwise returning users would get a
   * flash of the tutorial while the persisted `seenTutorials` map is still
   * loading. (Manual opens via the "?" button don't wait for this.)
   */
  hydrated: boolean;
}

interface TutorialActions {
  hasSeen: (modeKey: string) => boolean;
  markSeen: (modeKey: string) => void;
  /** First visit ever for this mode (and safe to show): hydrated && !seen. */
  shouldAutoShow: (modeKey: string) => boolean;
  setHydrated: () => void;
}

type TutorialStore = TutorialState & TutorialActions;

export const useTutorialStore = create<TutorialStore>()(
  persist(
    (set, get) => ({
      seenTutorials: {},
      hydrated: false,

      hasSeen: (modeKey: string) => {
        return !!get().seenTutorials[modeKey];
      },

      markSeen: (modeKey: string) => {
        set((state) => ({
          seenTutorials: { ...state.seenTutorials, [modeKey]: true },
        }));
      },

      shouldAutoShow: (modeKey: string) => {
        const s = get();
        return s.hydrated && !s.seenTutorials[modeKey];
      },

      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: 'tutorial-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        seenTutorials: state.seenTutorials,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);
