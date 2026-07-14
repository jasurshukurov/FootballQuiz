import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { useThemeColors } from '@/hooks/useTheme';

type Intensity = 'low' | 'med' | 'high';

const PARTICLE_COUNTS: Record<Intensity, number> = {
  low: 24,
  med: 40,
  high: 64,
};

function Particle({
  index,
  width,
  height,
  color,
}: {
  index: number;
  width: number;
  height: number;
  color: string;
}) {
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
          backgroundColor: color,
          borderRadius: cfg.round ? cfg.size / 2 : 2,
        },
        style,
      ]}
    />
  );
}

interface ConfettiProps {
  /** Particle density, scaled to result quality (perfect > win > partial). */
  intensity?: Intensity;
}

/** Lightweight one-shot confetti burst. Renders a burst of falling particles
 *  then should be unmounted by the parent (it does not loop). pointerEvents="none"
 *  so it never intercepts taps. Skipped entirely under reduced-motion. */
export default function Confetti({ intensity = 'med' }: ConfettiProps) {
  const { width, height } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const colors = useThemeColors();

  const palette = useMemo(
    () => [
      colors.accent,
      colors.accentBright,
      colors.streak,
      colors.streakBright,
      colors.accentDim,
      colors.textPrimary,
    ],
    [colors],
  );

  if (reducedMotion) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: PARTICLE_COUNTS[intensity] }).map((_, i) => (
        <Particle
          key={i}
          index={i}
          width={width}
          height={height}
          color={palette[i % palette.length]}
        />
      ))}
    </View>
  );
}
