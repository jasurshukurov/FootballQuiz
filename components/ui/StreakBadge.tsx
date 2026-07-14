import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { NotificationFeedbackType } from 'expo-haptics';

import { borderRadius, motion, spacing, type } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';
import { triggerNotification } from '@/lib/haptics';

const MILESTONES = [3, 7, 30, 100];

interface StreakBadgeProps {
  streak: number;
}

/** The current daily streak as an amber flame + count. Pops with a bouncy
 *  spring whenever the count increments; milestone streaks (3/7/30/100) add a
 *  label and a success haptic. */
export default function StreakBadge({ streak }: StreakBadgeProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isMilestone = MILESTONES.includes(streak);
  const scale = useSharedValue(1);
  const prevStreak = useRef(0);

  useEffect(() => {
    const incremented = streak > prevStreak.current;
    prevStreak.current = streak;
    if (streak <= 0 || !incremented) return;

    // Subtle acknowledgement pulse — big bouncy scales read as "jumping".
    scale.value = withSequence(withSpring(1.06, motion.spring), withSpring(1, motion.spring));
    if (isMilestone) {
      triggerNotification(NotificationFeedbackType.Success);
    }
  }, [streak, isMilestone, scale]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  if (streak <= 0) return null;

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <Text style={styles.text}>
        {'🔥'} {streak}-day streak
      </Text>
      {isMilestone && <Text style={styles.milestoneLabel}>Milestone!</Text>}
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
