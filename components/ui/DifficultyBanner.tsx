import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { spacing, borderRadius, type, motion } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';
import { bandForWeekday, FameBand } from '@/lib/difficultyCurve';

/** Player-facing names for the weekly curve's band labels. */
const BAND_DISPLAY: Record<FameBand['label'], string> = {
  easy: 'Easy',
  medium: 'Standard',
  hard: 'Hard',
  expert: 'Expert',
  wildcard: 'Wildcard',
};

/** Pip height per band — taller = harder, so the row reads as a ramp. */
const BAND_HEIGHT: Record<FameBand['label'], number> = {
  easy: 10,
  medium: 14,
  hard: 17,
  expert: 20,
  wildcard: 12,
};

/** Display order Monday-first (JS getDay: Sunday=0). */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

/** Exported so the hub hero's difficulty chip shares the same vocabulary. */
export function todayBandDisplay(now: Date = new Date()): string {
  return BAND_DISPLAY[bandForWeekday(now.getDay()).label];
}

/**
 * The hub's weekly difficulty ramp: seven pips (Monday-first) whose heights
 * follow the shared fame curve in lib/difficultyCurve.ts, today highlighted,
 * with "Tuesday · Standard" and a one-line explanation. Purely data-driven —
 * no fabricated difficulty.
 */
export default function DifficultyBanner() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const today = new Date().getDay();

  return (
    <Animated.View entering={FadeIn.duration(motion.base)} style={styles.card}>
      <View style={styles.pips}>
        {WEEK_ORDER.map((day) => {
          const band = bandForWeekday(day);
          const isToday = day === today;
          const isPast =
            WEEK_ORDER.indexOf(day as (typeof WEEK_ORDER)[number]) <
            WEEK_ORDER.indexOf(today as (typeof WEEK_ORDER)[number]);
          return (
            <View
              key={day}
              style={[
                styles.pip,
                { height: BAND_HEIGHT[band.label] },
                isToday ? styles.pipToday : isPast ? styles.pipPast : styles.pipFuture,
              ]}
            />
          );
        })}
      </View>
      <View style={styles.textCol}>
        <Text style={styles.title}>
          {WEEKDAY_NAMES[today]} · {todayBandDisplay()}
        </Text>
        <Text style={styles.sub}>Puzzles ramp up through the week. Saturday is expert day.</Text>
      </View>
    </Animated.View>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.lg,
      padding: spacing.lg,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.bgCard,
    },
    pips: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: spacing.xs,
      height: 20,
    },
    pip: {
      width: 8,
      borderRadius: 3,
    },
    pipToday: {
      backgroundColor: c.accentBright,
    },
    pipPast: {
      backgroundColor: c.accentDim,
    },
    pipFuture: {
      backgroundColor: c.borderStrong,
    },
    textCol: {
      flex: 1,
    },
    title: {
      ...type.bodyBold,
      color: c.textPrimary,
    },
    sub: {
      ...type.caption,
      color: c.textSecondary,
      marginTop: 1,
    },
  });
