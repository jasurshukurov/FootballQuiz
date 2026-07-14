/**
 * Pure notification-planning logic — no react-native / expo imports so it is
 * unit-testable under the node jest environment. lib/notifications.ts maps
 * the planned triggers onto real expo-notifications calls.
 *
 * Gentle by design: at most one scheduled reminder per calendar day (plus an
 * optional streak-saver evening nudge that is cancelled as soon as the user
 * plays), warm low-pressure copy, no FOMO shaming.
 */

export type NotificationFrequency = 'daily' | 'fewPerWeek' | 'weekly' | 'off';

export interface NotificationPrefs {
  frequency: NotificationFrequency;
  /** Local hour (0-23) the regular reminder fires at. */
  reminderHour: number;
  /** Extra one-off nudge at 20:30 when a streak >= 3 is at risk. */
  streakSaver: boolean;
}

export type PlannedTrigger =
  | { kind: 'daily'; hour: number; minute: number }
  | { kind: 'weekly'; weekday: number; hour: number; minute: number }
  | { kind: 'date'; date: Date };

export interface PlannedNotification {
  identifier: string;
  title: string;
  body: string;
  trigger: PlannedTrigger;
}

// --- Stable identifiers (ours and only ours — cancel these, never others) ---

/** Legacy id kept so pre-existing scheduled reminders get replaced/cancelled. */
export const DAILY_REMINDER_ID = 'daily-reminder';
export const WEEKLY_MON_ID = 'weekly-reminder-mon';
export const WEEKLY_THU_ID = 'weekly-reminder-thu';
export const WEEKLY_SAT_ID = 'weekly-reminder-sat';
export const STREAK_SAVER_ID = 'streak-saver-tonight';

export const ALL_NOTIFICATION_IDS = [
  DAILY_REMINDER_ID,
  WEEKLY_MON_ID,
  WEEKLY_THU_ID,
  WEEKLY_SAT_ID,
  STREAK_SAVER_ID,
] as const;

// --- Timing constants ---

/** expo-notifications WEEKLY weekday numbering: 1 = Sunday … 7 = Saturday. */
export const WEEKDAY = { sunday: 1, monday: 2, thursday: 5, saturday: 7 } as const;

export const DEFAULT_REMINDER_HOUR = 10;
export const STREAK_SAVER_HOUR = 20;
export const STREAK_SAVER_MINUTE = 30;
/** Streak saver only kicks in once a streak is worth protecting. */
export const MIN_STREAK_FOR_SAVER = 3;

export const NOTIFICATION_TITLE = 'Football Trivia';

// --- Copy (warm, low-pressure, max one emoji per message) ---

export const REMINDER_MESSAGES = [
  "Today's puzzles are ready when you are",
  'A fresh Mystery Player is waiting',
  'Two minutes of football trivia with your coffee? ☕',
  'New daily challenges are up. They keep all day, no rush',
];

export function getStreakMessage(streak: number): string {
  return `Day ${streak} streak: one quick game keeps it alive`;
}

export function getStreakSaverMessage(streak: number): string {
  return `Still time today. One quick game keeps your ${streak}-day streak alive 🔥`;
}

/**
 * Picks a reminder body. With an active streak (>1) there is a 50% chance of
 * the (gentle) streak message. `random` is injectable for tests.
 */
export function pickMessage(currentStreak?: number, random: () => number = Math.random): string {
  if (currentStreak && currentStreak > 1 && random() < 0.5) {
    return getStreakMessage(currentStreak);
  }
  const index = Math.floor(random() * REMINDER_MESSAGES.length);
  return REMINDER_MESSAGES[index] ?? REMINDER_MESSAGES[0];
}

export function clampHour(hour: number): number {
  if (!Number.isFinite(hour)) return DEFAULT_REMINDER_HOUR;
  return Math.min(23, Math.max(0, Math.round(hour)));
}

export interface PlanContext {
  /** Current daily streak (0 when none). */
  streak: number;
  /** "Now" — used to decide whether tonight's streak saver is still ahead. */
  now: Date;
  /** True when the user already completed a daily mode today. */
  playedToday: boolean;
}

/**
 * Computes the full desired notification schedule for the given preferences.
 * Deterministic given `random`; returns [] when frequency is 'off'.
 *
 * - daily      → one DAILY trigger at reminderHour:00
 * - fewPerWeek → WEEKLY triggers on Monday, Thursday, Saturday at reminderHour
 * - weekly     → one WEEKLY trigger on Saturday at reminderHour
 * - streak saver (opt-in, streak >= 3, not played today, before 20:30) →
 *   one ONE-OFF DATE trigger at today 20:30. It is a one-off precisely so it
 *   can be cancelled the moment daily play completes.
 */
export function planSchedule(
  prefs: NotificationPrefs,
  ctx: PlanContext,
  random: () => number = Math.random,
): PlannedNotification[] {
  if (prefs.frequency === 'off') return [];

  const hour = clampHour(prefs.reminderHour);
  const plans: PlannedNotification[] = [];
  const remind = (identifier: string, trigger: PlannedTrigger): void => {
    plans.push({
      identifier,
      title: NOTIFICATION_TITLE,
      body: pickMessage(ctx.streak, random),
      trigger,
    });
  };

  if (prefs.frequency === 'daily') {
    remind(DAILY_REMINDER_ID, { kind: 'daily', hour, minute: 0 });
  } else if (prefs.frequency === 'fewPerWeek') {
    remind(WEEKLY_MON_ID, { kind: 'weekly', weekday: WEEKDAY.monday, hour, minute: 0 });
    remind(WEEKLY_THU_ID, { kind: 'weekly', weekday: WEEKDAY.thursday, hour, minute: 0 });
    remind(WEEKLY_SAT_ID, { kind: 'weekly', weekday: WEEKDAY.saturday, hour, minute: 0 });
  } else {
    remind(WEEKLY_SAT_ID, { kind: 'weekly', weekday: WEEKDAY.saturday, hour, minute: 0 });
  }

  if (prefs.streakSaver && ctx.streak >= MIN_STREAK_FOR_SAVER && !ctx.playedToday) {
    const tonight = new Date(ctx.now);
    tonight.setHours(STREAK_SAVER_HOUR, STREAK_SAVER_MINUTE, 0, 0);
    // Only schedule while 20:30 is still ahead — a DATE trigger in the past
    // would fire immediately, which is exactly the jarring ping we avoid.
    if (tonight.getTime() > ctx.now.getTime()) {
      plans.push({
        identifier: STREAK_SAVER_ID,
        title: NOTIFICATION_TITLE,
        body: getStreakSaverMessage(ctx.streak),
        trigger: { kind: 'date', date: tonight },
      });
    }
  }

  return plans;
}
