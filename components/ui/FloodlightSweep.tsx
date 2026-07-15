import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/hooks/useTheme';

// A single stadium-floodlight pass — long enough to read as a sweep of light,
// short enough not to delay the result. Bespoke flourish timing (outside the
// shared motion vocabulary, like StreakFlame's flicker).
const SWEEP_MS = 1100;

interface FloodlightSweepProps {
  /** Fraction of the container width the light band spans. */
  bandFraction?: number;
}

/**
 * One-shot skewed light band that sweeps left-to-right across whatever it
 * overlays (mount it inside a relatively-positioned container). Absolute-fill,
 * pointerEvents none, clips its own band. Renders nothing under reduced motion
 * and unmounts itself after a single pass so it never lingers or re-runs.
 */
export default function FloodlightSweep({ bandFraction = 0.55 }: FloodlightSweepProps) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const [width, setWidth] = useState(() => Dimensions.get('window').width);
  const [done, setDone] = useState(false);
  const progress = useSharedValue(0);

  const bandWidth = Math.max(1, width * bandFraction);

  useEffect(() => {
    if (reduceMotion) return;
    progress.value = withTiming(
      1,
      { duration: SWEEP_MS, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(setDone)(true);
      },
    );
  }, [reduceMotion, progress]);

  // Travel from fully off the left edge to fully off the right edge.
  const bandStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: -bandWidth + progress.value * (width + bandWidth) },
      { skewX: '-12deg' },
    ],
  }));

  const gradientColors = useMemo(
    () => ['transparent', colors.accentSoft, 'transparent'] as const,
    [colors],
  );

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Math.abs(w - width) > 1) setWidth(w);
  };

  if (reduceMotion || done) return null;

  return (
    <View style={styles.root} pointerEvents="none" onLayout={onLayout}>
      <Animated.View style={[styles.band, { width: bandWidth }, bandStyle]}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  band: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
  },
});
