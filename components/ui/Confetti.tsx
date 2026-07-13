import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/constants/theme';

const PALETTE = [
  colors.pitchGreen,
  colors.neonGreen,
  colors.cardYellow,
  colors.cardRed,
  colors.matchGreen,
  colors.floodlightWhite,
];

const PARTICLE_COUNT = 40;

function Particle({ index, width, height }: { index: number; width: number; height: number }) {
  // Randomised once per mount so the burst has organic spread without
  // recomputing on every frame/render.
  const cfg = useMemo(
    () => ({
      left: Math.random() * width,
      driftX: (Math.random() - 0.5) * 140,
      delay: Math.random() * 350,
      duration: 1700 + Math.random() * 1000,
      rotateTo: (Math.random() * 6 - 3) * 360,
      size: 7 + Math.random() * 7,
      color: PALETTE[index % PALETTE.length],
      round: index % 2 === 0,
    }),
    [index, width],
  );

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      cfg.delay,
      withTiming(1, { duration: cfg.duration, easing: Easing.out(Easing.quad) }),
    );
  }, [cfg, progress]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: -40 + progress.value * (height + 80) },
      { translateX: progress.value * cfg.driftX },
      { rotate: `${progress.value * cfg.rotateTo}deg` },
    ],
    // Fade out over the last 30% of the fall.
    opacity: 1 - Math.max(0, progress.value - 0.7) / 0.3,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: 0,
          left: cfg.left,
          width: cfg.size,
          height: cfg.size,
          backgroundColor: cfg.color,
          borderRadius: cfg.round ? cfg.size / 2 : 2,
        },
        style,
      ]}
    />
  );
}

/** Lightweight one-shot confetti burst. Renders ~40 falling particles then
 *  should be unmounted by the parent (it does not loop). pointerEvents="none"
 *  so it never intercepts taps. */
export default function Confetti() {
  const { width, height } = useWindowDimensions();

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
        <Particle key={i} index={i} width={width} height={height} />
      ))}
    </View>
  );
}
