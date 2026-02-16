import { Platform } from 'react-native';

const DAILY_REMINDER_ID = 'daily-reminder';

async function getNotifications() {
  if (Platform.OS === 'web') return null;
  return await import('expo-notifications');
}

export async function requestNotificationPermissions(): Promise<boolean> {
  const Notifications = await getNotifications();
  if (!Notifications) return false;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleDailyReminder(): Promise<void> {
  const Notifications = await getNotifications();
  if (!Notifications) return;

  await cancelDailyReminder();

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return;

  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_REMINDER_ID,
    content: {
      title: 'Daily Football Trivia',
      body: "Today's puzzle is waiting for you! Can you keep your streak alive?",
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 20,
      minute: 0,
    },
  });
}

export async function cancelDailyReminder(): Promise<void> {
  const Notifications = await getNotifications();
  if (!Notifications) return;

  await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID);
}
