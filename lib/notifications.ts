import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTodayDateString } from '@/lib/dailySeed';
import {
  ALL_NOTIFICATION_IDS,
  PlannedNotification,
  PlannedTrigger,
  STREAK_SAVER_ID,
  planSchedule,
} from '@/lib/notificationPlan';
import { useNotificationPrefsStore } from '@/hooks/useNotificationPrefsStore';
import { useDailyStateStore } from '@/hooks/useDailyStateStore';

const ANDROID_CHANNEL_ID = 'daily-reminders';
const SCHEDULED_DATE_KEY = '@notifications_scheduled_date';
const PERMISSION_ASKED_KEY = '@notifications_permission_asked';
const NOTIFICATIONS_ENABLED_KEY = '@notifications_enabled';

type NotificationsModule = typeof import('expo-notifications');

async function getNotifications(): Promise<NotificationsModule | null> {
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

/** Global kill switch (More screen toggle). Independent of the frequency pref. */
export async function isNotificationsEnabled(): Promise<boolean> {
  const stored = await AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY);
  return stored !== 'false'; // enabled by default
}

export async function setNotificationsEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, String(enabled));
  if (enabled) {
    // The user just flipped notifications ON — an explicit interaction, so
    // requesting OS permission here is welcome, not jarring.
    await applyNotificationSchedule({ interactive: true });
  } else {
    await cancelAllPendingNotifications();
  }
}

/**
 * Asks the OS for notification permission, at most once ever (beyond that the
 * user manages it in system settings). Callers decide WHEN this is
 * appropriate — see `interactive` in applyNotificationSchedule; it is never
 * called on plain app launch.
 */
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

async function hasGrantedPermission(Notifications: NotificationsModule): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

function toExpoTrigger(Notifications: NotificationsModule, trigger: PlannedTrigger) {
  const channel = Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {};
  switch (trigger.kind) {
    case 'daily':
      return {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: trigger.hour,
        minute: trigger.minute,
        ...channel,
      } as const;
    case 'weekly':
      return {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: trigger.weekday, // 1 = Sunday … 7 = Saturday
        hour: trigger.hour,
        minute: trigger.minute,
        ...channel,
      } as const;
    case 'date':
      return {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: trigger.date,
        ...channel,
      } as const;
  }
}

async function scheduleOne(
  Notifications: NotificationsModule,
  planned: PlannedNotification,
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    identifier: planned.identifier,
    content: {
      title: planned.title,
      body: planned.body,
      sound: true,
    },
    trigger: toExpoTrigger(Notifications, planned.trigger),
  });
}

export interface ApplyScheduleOptions {
  /** Current streak; defaults to the daily-state store's value. */
  streak?: number;
  /**
   * True when triggered by an explicit user action (settings change, first
   * completed daily). Only then may the OS permission prompt appear —
   * plain app-opens never prompt.
   */
  interactive?: boolean;
  /** Whether today's daily is already done; defaults to the store's answer. */
  playedToday?: boolean;
}

/**
 * The single choke point for schedule mutations: cancels every notification
 * we own, then re-schedules per current preferences. Idempotent — safe to
 * call on every app open, pref change, or daily completion.
 */
export async function applyNotificationSchedule(options: ApplyScheduleOptions = {}): Promise<void> {
  const Notifications = await getNotifications();
  if (!Notifications) return;

  // Always start from a clean slate so stale identifiers never linger.
  await cancelAllPendingNotifications();

  const enabled = await isNotificationsEnabled();
  const prefs = useNotificationPrefsStore.getState();
  // 'off' (or the kill switch) means never even ask for permission.
  if (!enabled || prefs.frequency === 'off') return;

  const granted = options.interactive
    ? await requestNotificationPermissions()
    : await hasGrantedPermission(Notifications);
  if (!granted) return;

  await ensureAndroidChannel();

  const dailyState = useDailyStateStore.getState();
  const today = getTodayDateString();
  const streak = options.streak ?? dailyState.currentStreak;
  const playedToday = options.playedToday ?? dailyState.lastCompletedDate === today;

  const plan = planSchedule(
    {
      frequency: prefs.frequency,
      reminderHour: prefs.reminderHour,
      streakSaver: prefs.streakSaver,
    },
    { streak, now: new Date(), playedToday },
  );
  for (const planned of plan) {
    await scheduleOne(Notifications, planned);
  }

  await AsyncStorage.setItem(SCHEDULED_DATE_KEY, today);
}

/**
 * Called from the daily-completion path. Today is done, so tonight's
 * streak-saver one-off must not fire; the rest of the schedule is refreshed
 * (this is also the "soft ask" moment — the one non-settings place a
 * first-time permission prompt may appear).
 */
export async function scheduleNextDayReminder(currentStreak?: number): Promise<void> {
  await cancelTonightStreakSaver();
  await applyNotificationSchedule({
    streak: currentStreak,
    playedToday: true,
    interactive: true,
  });
}

/** Cancels only tonight's streak-saver one-off (the moment daily play completes). */
export async function cancelTonightStreakSaver(): Promise<void> {
  const Notifications = await getNotifications();
  if (!Notifications) return;
  await Notifications.cancelScheduledNotificationAsync(STREAK_SAVER_ID);
}

export async function cancelAllPendingNotifications(): Promise<void> {
  const Notifications = await getNotifications();
  if (!Notifications) return;

  // Cancel only OUR identifiers, never every scheduled notification the app
  // may have, so completing a mode doesn't wipe unrelated notifications.
  for (const id of ALL_NOTIFICATION_IDS) {
    await Notifications.cancelScheduledNotificationAsync(id);
  }
}

/**
 * Runs on every app open (from useNotificationSetup). Re-applies the schedule
 * non-interactively — it never triggers a permission prompt, and it refreshes
 * the streak-saver one-off for today when applicable.
 */
export async function rescheduleIfNeeded(): Promise<void> {
  await applyNotificationSchedule({ interactive: false });
}

// Keep backward-compatible export for existing call sites
export const scheduleDailyReminder = scheduleNextDayReminder;
