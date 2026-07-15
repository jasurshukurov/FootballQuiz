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

/** Bar heights grow through the week — the ramp reads left to right. */
const WEEKDAY_HEIGHTS = [12, 8, 10, 12, 14, 17, 20] as const;

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
  return WEEKDAY_TIERS[now.getDay()];
}

/**
 * The hub's weekly difficulty ramp strip (v3): seven Monday-first mini bars
 * growing in height through the week — past days in translucent accent,
 * today solid accent, future days muted — with "{Day} · {Tier}" and a
 * one-line explanation.
 */
export default function DifficultyBanner() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const today = new Date().getDay();

  return (
    <Animated.View entering={FadeIn.duration(motion.base)} style={styles.card}>
      <View style={styles.pips}>
        {WEEK_ORDER.map((day) => {
          const isToday = day === today;
          const isPast =
            WEEK_ORDER.indexOf(day as (typeof WEEK_ORDER)[number]) <
            WEEK_ORDER.indexOf(today as (typeof WEEK_ORDER)[number]);
          return (
            <View
              key={day}
              style={[
                styles.pip,
                { height: WEEKDAY_HEIGHTS[day] },
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
      backgroundColor: c.accent,
    },
    pipPast: {
      backgroundColor: c.accentSoft,
      borderWidth: 1,
      borderColor: c.accentBorder,
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
