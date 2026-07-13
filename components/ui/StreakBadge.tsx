import React, { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { NotificationFeedbackType } from 'expo-haptics';

import { colors, fonts } from '@/constants/theme';
import { triggerNotification } from '@/lib/haptics';

const MILESTONES = [3, 7, 30, 100];

interface StreakBadgeProps {
  streak: number;
}

/** Shows the current daily streak on a result card with a scale-in reveal.
 *  At milestone streaks (3/7/30/100) it gets a distinct flourish + success haptic. */
export default function StreakBadge({ streak }: StreakBadgeProps) {
  const isMilestone = MILESTONES.includes(streak);
  const scale = useSharedValue(0);

  useEffect(() => {
    if (streak <= 0) return;
    scale.value = withDelay(
      200,
      withSequence(
        withTiming(1.18, { duration: 240, easing: Easing.out(Easing.back(2)) }),
        withTiming(1, { duration: 160 }),
      ),
    );
    if (isMilestone) {
      triggerNotification(NotificationFeedbackType.Success);
    }
  }, [streak, isMilestone, scale]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  if (streak <= 0) return null;

  return (
    <Animated.View style={[styles.container, isMilestone && styles.milestone, animatedStyle]}>
      <Text style={[styles.text, isMilestone && styles.milestoneText]}>
        {'🔥'} {streak}-day streak
      </Text>
      {isMilestone && <Text style={styles.milestoneLabel}>Milestone!</Text>}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(5,242,108,0.3)',
    backgroundColor: 'rgba(5,242,108,0.12)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 2,
  },
  milestone: {
    borderColor: colors.cardYellow,
    backgroundColor: 'rgba(244,162,97,0.15)',
  },
  text: {
    fontSize: 15,
    fontFamily: fonts.subheading,
    color: colors.pitchGreen,
    letterSpacing: 0.5,
  },
  milestoneText: {
    color: colors.cardYellow,
  },
  milestoneLabel: {
    fontSize: 11,
    fontFamily: fonts.heading,
    color: colors.cardYellow,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
});
