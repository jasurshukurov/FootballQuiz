import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useThemeColors } from '@/hooks/useTheme';
import { motion } from '@/constants/theme';

type Size = 'sm' | 'md';

interface LivesIndicatorProps {
  /** Total lives/guesses/mistakes allowed. */
  total: number;
  /** How many remain — segments beyond this render as spent. */
  remaining: number;
  /** 'sm' fits a ScreenHeader right slot; 'md' for roomy bottom rows. */
  size?: Size;
  /**
   * Segment index (0-based) to flash danger-red — used when a life is being
   * lost this frame (e.g. Connections' mistake dots). Cleared by the caller.
   */
  flashIndex?: number | null;
  /** Accessibility label; defaults to "N of M remaining". */
  label?: string;
}

const DIMS: Record<Size, { width: number; height: number; gap: number }> = {
  sm: { width: 22, height: 6, gap: 3 },
  md: { width: 40, height: 8, gap: 4 },
};

/**
 * The one lives / limited-guesses indicator for every mode — animated skewed
 * segments that fill green while a life remains and fade out when spent. Use it
 * wherever a mode shows lives, hearts, guesses-left or mistakes-remaining so the
 * app speaks one visual language (see DESIGN_SYSTEM.md).
 */
function LivesIndicator({
  total,
  remaining,
  size = 'md',
  flashIndex = null,
  label,
}: LivesIndicatorProps) {
  const dims = DIMS[size];
  return (
    <View
      style={[styles.container, { gap: dims.gap }]}
      accessibilityRole="progressbar"
      accessibilityLabel={label ?? `${remaining} of ${total} remaining`}>
      {Array.from({ length: total }, (_, i) => (
        <Segment
          key={i}
          active={i < remaining}
          flashing={i === flashIndex}
          width={dims.width}
          height={dims.height}
        />
      ))}
    </View>
  );
}

function Segment({
  active,
  flashing,
  width,
  height,
}: {
  active: boolean;
  flashing: boolean;
  width: number;
  height: number;
}) {
  const colors = useThemeColors();
  const fill = flashing ? colors.danger : active ? colors.accent : colors.border;

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: withTiming(flashing || active ? 1 : 0.3, { duration: motion.base }),
    backgroundColor: withTiming(fill, { duration: motion.base }),
  }));

  return (
    <Animated.View
      style={[
        styles.segment,
        { width, height },
        animatedStyle,
        active && !flashing && [styles.glow, { shadowColor: colors.accent }],
      ]}
    />
  );
}

export default React.memo(LivesIndicator);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  segment: {
    borderRadius: 2,
    transform: [{ skewX: '-12deg' }],
  },
  glow: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
});
