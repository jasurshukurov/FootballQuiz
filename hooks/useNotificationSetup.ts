import { useEffect } from 'react';
import { Platform } from 'react-native';
import { requestNotificationPermissions, rescheduleIfNeeded } from '@/lib/notifications';

export function useNotificationSetup() {
  useEffect(() => {
    if (Platform.OS === 'web') return;

    let responseSubscription: { remove: () => void } | undefined;

    (async () => {
      await requestNotificationPermissions();
      await rescheduleIfNeeded();

      // Listen for notification taps
      const Notifications = await import('expo-notifications');
      responseSubscription = Notifications.addNotificationResponseReceivedListener(() => {
        // App opened from notification - no special routing needed,
        // the app will show the daily menu by default
      });
    })();

    return () => {
      responseSubscription?.remove();
    };
  }, []);
}
