import React, { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { ImpactFeedbackStyle } from 'expo-haptics';

import { colors, fonts } from '@/constants/theme';
import { triggerImpact } from '@/lib/haptics';

interface LastChanceHintProps {
  label?: string;
}

/** A red, pulsing "Last chance!" pill for the final guess/attempt. Fires a
 *  heavy haptic on mount (i.e. when the player enters the last chance). */
export default function LastChanceHint({ label = 'LAST CHANCE!' }: LastChanceHintProps) {
  const pulse = useSharedValue(1);

  useEffect(() => {
    triggerImpact(ImpactFeedbackStyle.Heavy);
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 500, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 500, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      true,
    );
  }, [pulse]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  return (
    <Animated.View style={[styles.pill, animatedStyle]}>
      <Text style={styles.text}>{label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'center',
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: colors.cardRed,
    backgroundColor: 'rgba(230,57,70,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 5,
    marginBottom: 8,
  },
  text: {
    fontSize: 13,
    fontFamily: fonts.heading,
    color: colors.cardRed,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
