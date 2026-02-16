import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ProState {
  isPro: boolean;
}

interface ProActions {
  setPro: (value: boolean) => void;
}

type ProStore = ProState & ProActions;

export const useProStore = create<ProStore>()(
  persist(
    (set) => ({
      isPro: false,

      setPro: (value: boolean) => {
        set({ isPro: value });
      },
    }),
    {
      name: 'pro-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        isPro: state.isPro,
      }),
    },
  ),
);
