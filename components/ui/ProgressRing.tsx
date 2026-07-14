import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import { motion } from '@/constants/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface ProgressRingProps {
  /** Outer diameter in pt. */
  size: number;
  strokeWidth: number;
  /** 0..1 — values outside the range are clamped. */
  progress: number;
  /** Ring color — pass a theme color (e.g. colors.accent). */
  color: string;
  /** Track (unfilled) color — e.g. colors.bgCard or colors.border. */
  trackColor: string;
  /** Centered content (score text, icon, ...). */
  children?: React.ReactNode;
}

/**
 * Animated circular progress ring (react-native-svg + reanimated).
 * Starts at 12 o'clock, fills clockwise; progress changes animate with
 * withTiming(motion.slow). Works on native and web.
 */
export default function ProgressRing({
  size,
  strokeWidth,
  progress,
  color,
  trackColor,
  children,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(1, Math.max(0, progress));

  const animatedProgress = useSharedValue(clamped);

  useEffect(() => {
    animatedProgress.value = withTiming(clamped, { duration: motion.slow });
  }, [clamped, animatedProgress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - animatedProgress.value),
  }));

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={styles.rotated}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
          fill="none"
        />
      </Svg>
      {children != null && <View style={styles.center}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  // Rotate so progress starts at the top instead of 3 o'clock.
  rotated: {
    transform: [{ rotate: '-90deg' }],
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
