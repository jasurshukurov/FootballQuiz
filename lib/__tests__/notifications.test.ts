import {
  ALL_NOTIFICATION_IDS,
  DAILY_REMINDER_ID,
  MIN_STREAK_FOR_SAVER,
  NotificationPrefs,
  REMINDER_MESSAGES,
  STREAK_SAVER_HOUR,
  STREAK_SAVER_ID,
  STREAK_SAVER_MINUTE,
  WEEKDAY,
  WEEKLY_MON_ID,
  WEEKLY_SAT_ID,
  WEEKLY_THU_ID,
  clampHour,
  getStreakMessage,
  getStreakSaverMessage,
  pickMessage,
  planSchedule,
} from '../notificationPlan';

const basePrefs: NotificationPrefs = {
  frequency: 'fewPerWeek',
  reminderHour: 10,
  streakSaver: true,
};

// A morning "now" so the 20:30 streak saver is still ahead.
const MORNING = new Date(2026, 6, 13, 9, 0, 0); // Monday 2026-07-13 09:00 local
const LATE_EVENING = new Date(2026, 6, 13, 21, 0, 0); // past 20:30

const baseCtx = { streak: 0, now: MORNING, playedToday: false };

describe('planSchedule — frequency', () => {
  it("returns nothing for 'off' (even with a big streak)", () => {
    expect(planSchedule({ ...basePrefs, frequency: 'off' }, { ...baseCtx, streak: 12 })).toEqual(
      [],
    );
  });

  it("'daily' plans exactly one DAILY trigger at reminderHour:00", () => {
    const plan = planSchedule({ ...basePrefs, frequency: 'daily', reminderHour: 18 }, baseCtx);
    expect(plan).toHaveLength(1);
    expect(plan[0].identifier).toBe(DAILY_REMINDER_ID);
    expect(plan[0].trigger).toEqual({ kind: 'daily', hour: 18, minute: 0 });
  });

  it("'fewPerWeek' plans WEEKLY triggers on Mon, Thu, Sat with distinct stable ids", () => {
    const plan = planSchedule({ ...basePrefs, frequency: 'fewPerWeek' }, baseCtx);
    expect(plan.map((p) => p.identifier)).toEqual([WEEKLY_MON_ID, WEEKLY_THU_ID, WEEKLY_SAT_ID]);
    expect(plan.map((p) => p.trigger)).toEqual([
      { kind: 'weekly', weekday: WEEKDAY.monday, hour: 10, minute: 0 },
      { kind: 'weekly', weekday: WEEKDAY.thursday, hour: 10, minute: 0 },
      { kind: 'weekly', weekday: WEEKDAY.saturday, hour: 10, minute: 0 },
    ]);
    // expo-notifications numbering: 1 = Sunday, so Mon=2, Thu=5, Sat=7.
    expect(WEEKDAY.monday).toBe(2);
    expect(WEEKDAY.thursday).toBe(5);
    expect(WEEKDAY.saturday).toBe(7);
  });

  it("'weekly' plans a single Saturday WEEKLY trigger", () => {
    const plan = planSchedule({ ...basePrefs, frequency: 'weekly' }, baseCtx);
    expect(plan).toHaveLength(1);
    expect(plan[0].identifier).toBe(WEEKLY_SAT_ID);
    expect(plan[0].trigger).toEqual({
      kind: 'weekly',
      weekday: WEEKDAY.saturday,
      hour: 10,
      minute: 0,
    });
  });

  it('honors a custom reminder hour and clamps out-of-range values', () => {
    const plan = planSchedule({ ...basePrefs, frequency: 'daily', reminderHour: 99 }, baseCtx);
    expect(plan[0].trigger).toEqual({ kind: 'daily', hour: 23, minute: 0 });
    expect(clampHour(-5)).toBe(0);
    expect(clampHour(NaN)).toBe(10);
  });

  it('all planned identifiers are covered by ALL_NOTIFICATION_IDS (so cancel wipes them)', () => {
    for (const frequency of ['daily', 'fewPerWeek', 'weekly'] as const) {
      const plan = planSchedule({ ...basePrefs, frequency }, { ...baseCtx, streak: 10 });
      for (const p of plan) {
        expect(ALL_NOTIFICATION_IDS).toContain(p.identifier);
      }
    }
  });
});

describe('planSchedule — streak saver', () => {
  const streakCtx = { streak: MIN_STREAK_FOR_SAVER, now: MORNING, playedToday: false };

  function saverOf(plan: ReturnType<typeof planSchedule>) {
    return plan.find((p) => p.identifier === STREAK_SAVER_ID);
  }

  it('adds a ONE-OFF date trigger at today 20:30 when a streak is at risk', () => {
    const saver = saverOf(planSchedule(basePrefs, streakCtx));
    expect(saver).toBeDefined();
    expect(saver!.trigger.kind).toBe('date');
    const date = (saver!.trigger as { kind: 'date'; date: Date }).date;
    expect(date.getFullYear()).toBe(MORNING.getFullYear());
    expect(date.getMonth()).toBe(MORNING.getMonth());
    expect(date.getDate()).toBe(MORNING.getDate());
    expect(date.getHours()).toBe(STREAK_SAVER_HOUR);
    expect(date.getMinutes()).toBe(STREAK_SAVER_MINUTE);
  });

  it('uses the soft streak-saver copy with the streak count and one emoji at most', () => {
    const saver = saverOf(planSchedule(basePrefs, { ...streakCtx, streak: 12 }));
    expect(saver!.body).toBe(getStreakSaverMessage(12));
    expect(saver!.body).toContain('12-day streak');
  });

  it('is skipped when the user already played today', () => {
    expect(saverOf(planSchedule(basePrefs, { ...streakCtx, playedToday: true }))).toBeUndefined();
  });

  it(`is skipped below a ${MIN_STREAK_FOR_SAVER}-day streak`, () => {
    expect(
      saverOf(planSchedule(basePrefs, { ...streakCtx, streak: MIN_STREAK_FOR_SAVER - 1 })),
    ).toBeUndefined();
  });

  it('is skipped when the preference is disabled', () => {
    expect(saverOf(planSchedule({ ...basePrefs, streakSaver: false }, streakCtx))).toBeUndefined();
  });

  it("is skipped when it's already past 20:30 (a past DATE trigger would fire instantly)", () => {
    expect(saverOf(planSchedule(basePrefs, { ...streakCtx, now: LATE_EVENING }))).toBeUndefined();
  });

  it("is skipped entirely when frequency is 'off' (never nudge someone who opted out)", () => {
    expect(planSchedule({ ...basePrefs, frequency: 'off' }, streakCtx)).toEqual([]);
  });
});

describe('copy', () => {
  it('picks from the warm reminder pool when there is no streak', () => {
    const msg = pickMessage(0, () => 0);
    expect(REMINDER_MESSAGES).toContain(msg);
  });

  it('picks the gentle streak message half the time when a streak > 1 exists', () => {
    expect(pickMessage(5, () => 0.4)).toBe(getStreakMessage(5));
    const rolls = [0.6, 0]; // fail the 50% roll, then pick index 0
    expect(pickMessage(5, () => rolls.shift() ?? 0)).toBe(REMINDER_MESSAGES[0]);
  });

  it('never uses FOMO copy and keeps at most one emoji per message', () => {
    const all = [...REMINDER_MESSAGES, getStreakMessage(7), getStreakSaverMessage(7)];
    for (const msg of all) {
      expect(msg.toLowerCase()).not.toContain('rival');
      expect(msg.toLowerCase()).not.toContain('lose');
      const emojiCount = [...msg].filter((ch) => /\p{Extended_Pictographic}/u.test(ch)).length;
      expect(emojiCount).toBeLessThanOrEqual(1);
    }
  });
});
