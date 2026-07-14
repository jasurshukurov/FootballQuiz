import { useEffect } from 'react';
import { Platform } from 'react-native';
import { cancelTonightStreakSaver, rescheduleIfNeeded } from '@/lib/notifications';
import { useDailyStateStore } from '@/hooks/useDailyStateStore';
import { getTodayDateString } from '@/lib/dailySeed';

/**
 * App-level notification wiring. Deliberately quiet:
 * - Never requests OS permission on launch — the schedule is only refreshed
 *   non-interactively; the permission prompt appears the first time the user
 *   touches notification settings or completes a daily game.
 * - Refreshes the schedule on every app open so the streak-saver one-off
 *   (a DATE trigger for today 20:30) stays current.
 * - Watches for the day's completion and cancels tonight's streak saver the
 *   moment daily play is done, whichever screen recorded it.
 */
export function useNotificationSetup() {
  useEffect(() => {
    if (Platform.OS === 'web') return;

    let responseSubscription: { remove: () => void } | undefined;

    (async () => {
      await rescheduleIfNeeded();

      // Listen for notification taps
      const Notifications = await import('expo-notifications');
      responseSubscription = Notifications.addNotificationResponseReceivedListener(() => {
        // App opened from notification - no special routing needed,
        // the app will show the daily menu by default
      });
    })();

    // Day-complete detection: as soon as today's streak is kept, the 20:30
    // streak-saver nudge is no longer needed.
    const unsubscribe = useDailyStateStore.subscribe((state, prevState) => {
      const today = getTodayDateString();
      if (state.lastCompletedDate === today && prevState.lastCompletedDate !== today) {
        cancelTonightStreakSaver().catch(() => {});
      }
    });

    return () => {
      responseSubscription?.remove();
      unsubscribe();
    };
  }, []);
}
