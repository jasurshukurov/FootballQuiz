import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { type, spacing, borderRadius, touch, motion } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';
import { triggerImpact } from '@/lib/haptics';
import { ImpactFeedbackStyle } from 'expo-haptics';

/** How long the button must be held before it fires. The progress fill runs
 *  exactly this long, so the visual and the trigger can never drift apart. */
const HOLD_MS = 700;

interface GiveUpButtonProps {
  onGiveUp: () => void;
}

/**
 * The one give-up control, shared by every mode. Hold-to-confirm: pressing
 * starts a danger-tinted fill sweeping left to right; releasing early drains
 * it back. It fires when the fill completes. The fill is functional feedback
 * (it shows how far the confirm is), so it stays on under reduced motion.
 *
 * Deliberately NOT a Tappable: the long-press is the whole point of this
 * control (prevents accidental reveals), which Tappable's tap-only API
 * can't express.
 */
function GiveUpButton({ onGiveUp }: GiveUpButtonProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [pressing, setPressing] = useState(false);
  const [width, setWidth] = useState(0);
  const progress = useSharedValue(0);

  const fire = () => {
    triggerImpact(ImpactFeedbackStyle.Heavy);
    setPressing(false);
    progress.value = 0;
    onGiveUp();
  };

  const handlePressIn = () => {
    setPressing(true);
    triggerImpact(ImpactFeedbackStyle.Light);
    progress.value = withTiming(1, { duration: HOLD_MS, easing: Easing.linear }, (finished) => {
      if (finished) runOnJS(fire)();
    });
  };

  const handlePressOut = () => {
    setPressing(false);
    // Released early: drain the fill back so a re-press starts clean.
    progress.value = withTiming(0, { duration: motion.fast, easing: Easing.out(Easing.quad) });
  };

  const handleLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const fillStyle = useAnimatedStyle(() => ({
    width: progress.value * width,
  }));

  return (
    <View style={styles.wrapper}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onLayout={handleLayout}
        accessibilityLabel="Give up, hold to confirm"
        style={[styles.button, pressing && styles.buttonPressed]}>
        <Animated.View style={[styles.fill, fillStyle]} pointerEvents="none" />
        <Text style={styles.label}>Give Up</Text>
      </Pressable>
      <Text style={styles.hint}>Hold to reveal</Text>
    </View>
  );
}

export default React.memo(GiveUpButton);

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    wrapper: {
      alignItems: 'center',
    },
    button: {
      backgroundColor: c.bgCard,
      borderWidth: 1,
      borderColor: c.dangerSoft,
      borderRadius: borderRadius.full,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      minHeight: touch.min,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    },
    buttonPressed: {
      borderColor: c.danger,
      backgroundColor: c.bgCardPressed,
    },
    fill: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      backgroundColor: c.dangerSoft,
    },
    label: {
      ...type.captionBold,
      color: c.textSecondary,
    },
    hint: {
      ...type.micro,
      color: c.textMuted,
      textAlign: 'center',
      marginTop: spacing.xs + 2,
    },
  });
