import AsyncStorage from '@react-native-async-storage/async-storage';

import { useGuessGameStore } from '@/hooks/useGuessGameStore';
import { useDailyStateStore } from '@/hooks/useDailyStateStore';
import { useProStore } from '@/hooks/useProStore';

/**
 * Delete all user account data (GDPR/CCPA compliant).
 * Clears AsyncStorage and resets all Zustand stores.
 */
export async function deleteUserAccount(): Promise<void> {
  // In production, call backend API to delete server-side data:
  // await fetch('https://api.footballtrivia.app/account', { method: 'DELETE' });

  await AsyncStorage.clear();

  useGuessGameStore.getState().resetGame();
  useDailyStateStore.getState().checkAndUpdateStreak();
  useProStore.getState().setPro(false);
}
