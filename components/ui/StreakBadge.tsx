import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { NotificationFeedbackType } from 'expo-haptics';

import { borderRadius, motion, spacing, type } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';
import { useIsNewBestStreak } from '@/hooks/useDailyStateStore';
import { triggerNotification } from '@/lib/haptics';

const MILESTONES = [3, 7, 30, 100];

interface StreakBadgeProps {
  streak: number;
}

/** The current daily streak as an amber flame + count. Pops with a bouncy
 *  spring whenever the count increments; a new all-time best gets a "New
 *  best!" label and a stronger pulse, milestone streaks (3/7/30/100) a
 *  "Milestone!" label. Both add a success haptic. */
export default function StreakBadge({ streak }: StreakBadgeProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isMilestone = MILESTONES.includes(streak);
  const isNewBest = useIsNewBestStreak();
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  // null until the first render — the badge must NOT pulse on mount (every
  // game-over screen mounts one; a pulse each visit reads as "jumping").
  // Only a live increment while mounted animates.
  const prevStreak = useRef<number | null>(null);

  useEffect(() => {
    const prev = prevStreak.current;
    prevStreak.current = streak;
    if (prev === null || streak <= 0 || streak <= prev) return;

    // Subtle acknowledgement pulse, ease curves only (v3: no bounce).
    // A new record earns one extra, slightly larger beat.
    if (!reduceMotion) {
      const beat = (to: number) =>
        withTiming(to, { duration: motion.fast, easing: Easing.inOut(Easing.quad) });
      scale.value = isNewBest
        ? withSequence(beat(1.1), beat(1), beat(1.06), beat(1))
        : withSequence(beat(1.06), beat(1));
    }
    if (isMilestone || isNewBest) {
      triggerNotification(NotificationFeedbackType.Success);
    }
  }, [streak, isMilestone, isNewBest, scale, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  if (streak <= 0) return null;

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <Text style={styles.text}>
        {'🔥'} {streak}-day streak
      </Text>
      {isNewBest ? (
        <Text style={styles.milestoneLabel}>New best!</Text>
      ) : (
        isMilestone && <Text style={styles.milestoneLabel}>Milestone!</Text>
      )}
    </Animated.View>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      alignSelf: 'center',
      borderRadius: borderRadius.full,
      borderWidth: 1,
      borderColor: c.streak,
      backgroundColor: c.streakSoft,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.xs,
      gap: 2,
    },
    text: {
      ...type.bodyBold,
      color: c.streakBright,
      letterSpacing: 0.5,
    },
    milestoneLabel: {
      ...type.micro,
      color: c.streak,
      textTransform: 'uppercase',
      letterSpacing: 2,
    },
  });
