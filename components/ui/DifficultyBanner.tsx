import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { spacing, borderRadius, type, motion } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';

/** v3 player-facing tier name per weekday (JS getDay: Sunday=0). The real
 *  fame windows live in lib/difficultyCurve.ts and already differ per day;
 *  these are the display names the prototype uses for each. */
const WEEKDAY_TIERS = [
  'Classic', // Sun — wildcard band
  'Warm-up', // Mon
  'Standard', // Tue
  'Standard', // Wed
  'Tricky', // Thu
  'Hard', // Fri
  'Expert', // Sat — the weekly summit
] as const;

/** Display order Monday-first (JS getDay: Sunday=0). */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

/** Single letters under the segments, Monday-first. */
const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;

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
  return WEEKDAY_TIERS[now.getDay()];
}

/**
 * The hub's weekly difficulty strip: "{Day} · {Tier}" headline, a one-line
 * explanation, and a full-width segmented week bar (Monday-first) with day
 * letters — days gone by in soft accent, today solid accent, days ahead muted.
 */
export default function DifficultyBanner() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const today = new Date().getDay();
  const todayIdx = WEEK_ORDER.indexOf(today as (typeof WEEK_ORDER)[number]);

  return (
    <Animated.View entering={FadeIn.duration(motion.base)} style={styles.card}>
      <Text style={styles.title}>
        {WEEKDAY_NAMES[today]} · {todayBandDisplay()}
      </Text>
      <Text style={styles.sub}>Puzzles ramp up through the week. Saturday is expert day.</Text>
      <View style={styles.track}>
        {WEEK_ORDER.map((day, i) => {
          const isToday = i === todayIdx;
          const isPast = i < todayIdx;
          return (
            <View key={day} style={styles.dayCol}>
              <View
                style={[
                  styles.segment,
                  isToday ? styles.segmentToday : isPast ? styles.segmentPast : null,
                ]}
              />
              <Text style={isToday ? styles.dayLetterToday : styles.dayLetter}>
                {DAY_LETTERS[i]}
              </Text>
            </View>
          );
        })}
      </View>
    </Animated.View>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    card: {
      padding: spacing.lg,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.bgCard,
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
    track: {
      flexDirection: 'row',
      gap: spacing.xs,
      marginTop: spacing.md,
    },
    dayCol: {
      flex: 1,
      alignItems: 'center',
      gap: spacing.xs,
    },
    segment: {
      alignSelf: 'stretch',
      height: 6,
      borderRadius: borderRadius.full,
      backgroundColor: c.borderStrong,
    },
    segmentPast: {
      backgroundColor: c.accentSoft,
    },
    segmentToday: {
      backgroundColor: c.accent,
    },
    dayLetter: {
      ...type.micro,
      color: c.textMuted,
    },
    dayLetterToday: {
      ...type.micro,
      color: c.accent,
    },
  });
