import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface TutorialState {
  seenTutorials: Record<string, boolean>;
}

interface TutorialActions {
  hasSeen: (modeKey: string) => boolean;
  markSeen: (modeKey: string) => void;
}

type TutorialStore = TutorialState & TutorialActions;

export const useTutorialStore = create<TutorialStore>()(
  persist(
    (set, get) => ({
      seenTutorials: {},

      hasSeen: (modeKey: string) => {
        return !!get().seenTutorials[modeKey];
      },

      markSeen: (modeKey: string) => {
        set((state) => ({
          seenTutorials: { ...state.seenTutorials, [modeKey]: true },
        }));
      },
    }),
    {
      name: 'tutorial-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        seenTutorials: state.seenTutorials,
      }),
    },
  ),
);
