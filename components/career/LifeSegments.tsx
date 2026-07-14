import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useThemeColors } from '@/hooks/useTheme';

interface LifeSegmentsProps {
  total: number;
  remaining: number;
}

const SEGMENT_WIDTH = 40;
const SEGMENT_HEIGHT = 8;
const SEGMENT_GAP = 4;

function LifeSegments({ total, remaining }: LifeSegmentsProps) {
  return (
    <View style={styles.container}>
      {Array.from({ length: total }, (_, i) => (
        <Segment key={i} active={i < remaining} />
      ))}
    </View>
  );
}

function Segment({ active }: { active: boolean }) {
  const colors = useThemeColors();
  const activeColor = colors.accent;
  const inactiveColor = colors.border;

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: withTiming(active ? 1 : 0.3, { duration: 300 }),
    backgroundColor: withTiming(active ? activeColor : inactiveColor, {
      duration: 300,
    }),
  }));

  return (
    <Animated.View
      style={[
        styles.segment,
        animatedStyle,
        active && [styles.segmentGlow, { shadowColor: colors.accent }],
      ]}
    />
  );
}

export default React.memo(LifeSegments);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SEGMENT_GAP,
  },
  segment: {
    width: SEGMENT_WIDTH,
    height: SEGMENT_HEIGHT,
    borderRadius: 2,
    transform: [{ skewX: '-12deg' }],
  },
  segmentGlow: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
});
