import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { ImpactFeedbackStyle } from 'expo-haptics';

import { borderRadius, spacing, type } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';
import { triggerImpact } from '@/lib/haptics';

interface LastChanceHintProps {
  label?: string;
}

/** A red, pulsing "Last chance!" pill for the final guess/attempt. Fires a
 *  heavy haptic on mount (i.e. when the player enters the last chance). */
export default function LastChanceHint({ label = 'LAST CHANCE!' }: LastChanceHintProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const pulse = useSharedValue(1);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    triggerImpact(ImpactFeedbackStyle.Heavy);
    if (reducedMotion) return;
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 500, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 500, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      true,
    );
  }, [pulse, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  return (
    <Animated.View style={[styles.pill, animatedStyle]}>
      <Text style={styles.text}>{label}</Text>
    </Animated.View>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    pill: {
      alignSelf: 'center',
      borderRadius: borderRadius.full,
      borderWidth: 1.5,
      borderColor: c.danger,
      backgroundColor: c.dangerSoft,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.xs,
      marginBottom: spacing.sm,
    },
    text: {
      ...type.captionBold,
      color: c.dangerBright,
      letterSpacing: 2,
      textTransform: 'uppercase',
    },
  });
