import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { fonts, type } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';

interface AnimatedBarProps {
  label: string;
  value: number;
  maxValue: number;
  index: number;
  labelWidth?: number;
  /** Defaults to the theme accent. */
  barColor?: string;
}

function AnimatedBar({
  label,
  value,
  maxValue,
  index,
  labelWidth = 20,
  barColor,
}: AnimatedBarProps) {
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const resolvedBarColor = barColor ?? colors.accent;

  const targetPercent = maxValue > 0 ? Math.max((value / maxValue) * 100, 8) : 8;
  const widthProgress = useSharedValue(0);

  useEffect(() => {
    widthProgress.value = withDelay(index * 80, withTiming(targetPercent, { duration: 600 }));
  }, [targetPercent, index, widthProgress]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${widthProgress.value}%` as unknown as number,
  }));

  return (
    <View style={layout.row}>
      <Text style={[styles.label, { width: labelWidth }]} numberOfLines={1}>
        {label}
      </Text>
      <View style={layout.barContainer}>
        <Animated.View
          style={[
            layout.bar,
            shadows.neonGlow,
            { backgroundColor: resolvedBarColor, borderRightColor: colors.accentBright },
            animatedStyle,
          ]}>
          <Text style={styles.valueText}>{value}</Text>
        </Animated.View>
      </View>
    </View>
  );
}

export default React.memo(AnimatedBar);

const layout = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barContainer: {
    flex: 1,
  },
  bar: {
    minWidth: 24,
    alignItems: 'flex-end',
    borderRadius: 2,
    borderRightWidth: 2,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
});

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    label: {
      ...type.caption,
      textAlign: 'center',
      fontFamily: fonts.scoreboard,
      color: c.textPrimary,
    },
    valueText: {
      ...type.caption,
      fontFamily: fonts.scoreboard,
      color: c.textPrimary,
    },
  });
