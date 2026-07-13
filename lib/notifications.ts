import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTodayDateString } from '@/lib/dailySeed';

const DAILY_REMINDER_ID = 'daily-reminder';
const ANDROID_CHANNEL_ID = 'daily-reminders';
const SCHEDULED_DATE_KEY = '@notifications_scheduled_date';
const PERMISSION_ASKED_KEY = '@notifications_permission_asked';
const NOTIFICATIONS_ENABLED_KEY = '@notifications_enabled';

const REMINDER_MESSAGES = [
  'New Daily Modes are live! Can you complete all 10?',
  'The Mystery Player is waiting...',
  '10 new challenges just dropped!',
  'Your rivals are already playing today',
];

function getStreakMessage(streak: number): string {
  return `Don't lose your ${streak}-day streak!`;
}

function pickMessage(currentStreak?: number): string {
  if (currentStreak && currentStreak > 1) {
    // 50% chance to show streak message when there's a streak
    if (Math.random() < 0.5) {
      return getStreakMessage(currentStreak);
    }
  }
  const index = Math.floor(Math.random() * REMINDER_MESSAGES.length);
  return REMINDER_MESSAGES[index];
}

async function getNotifications() {
  if (Platform.OS === 'web') return null;
  return await import('expo-notifications');
}

/**
 * Ensures the Android notification channel used for scheduling exists.
 * Must run before scheduling (not only on the first permission request),
 * otherwise reminders on later sessions target a channel that was never
 * created. No-op on non-Android platforms.
 */
async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  const Notifications = await getNotifications();
  if (!Notifications) return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Daily Reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
  });
}

export async function isNotificationsEnabled(): Promise<boolean> {
  const stored = await AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY);
  return stored !== 'false'; // enabled by default
}

export async function setNotificationsEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, String(enabled));
  if (!enabled) {
    await cancelAllPendingNotifications();
  }
}

export async function requestNotificationPermissions(): Promise<boolean> {
  const Notifications = await getNotifications();
  if (!Notifications) return false;

  const alreadyAsked = await AsyncStorage.getItem(PERMISSION_ASKED_KEY);
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === 'granted') return true;

  if (alreadyAsked) return false;

  const { status } = await Notifications.requestPermissionsAsync();
  // Persist the ask-once flag only AFTER the request resolves, so a request
  // that throws (or is dismissed by a transient failure) doesn't permanently
  // block the in-app prompt.
  await AsyncStorage.setItem(PERMISSION_ASKED_KEY, 'true');

  return status === 'granted';
}

export async function scheduleNextDayReminder(currentStreak?: number): Promise<void> {
  const Notifications = await getNotifications();
  if (!Notifications) return;

  const enabled = await isNotificationsEnabled();
  if (!enabled) return;

  await cancelAllPendingNotifications();

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return;

  // Create the channel every time before scheduling, since the permission
  // request no longer runs on returning sessions.
  await ensureAndroidChannel();

  const message = pickMessage(currentStreak);
  const today = getTodayDateString();
  await AsyncStorage.setItem(SCHEDULED_DATE_KEY, today);

  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_REMINDER_ID,
    content: {
      title: 'Football Quiz',
      body: message,
      sound: true,
      ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 10,
      minute: 0,
    },
  });
}

export async function cancelAllPendingNotifications(): Promise<void> {
  const Notifications = await getNotifications();
  if (!Notifications) return;

  // Cancel only our daily reminder, not every scheduled notification the app
  // may have, so completing a mode doesn't wipe unrelated notifications.
  await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID);
}

export async function rescheduleIfNeeded(): Promise<void> {
  const enabled = await isNotificationsEnabled();
  if (!enabled) return;

  const lastScheduled = await AsyncStorage.getItem(SCHEDULED_DATE_KEY);
  const today = getTodayDateString();

  // Re-schedule if we haven't scheduled today
  if (lastScheduled !== today) {
    await scheduleNextDayReminder();
  }
}

// Keep backward-compatible export for existing _layout.tsx usage
export const scheduleDailyReminder = scheduleNextDayReminder;
