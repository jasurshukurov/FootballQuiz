import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { colors, fonts, shadows } from '@/constants/theme';

interface AnimatedBarProps {
  label: string;
  value: number;
  maxValue: number;
  index: number;
  labelWidth?: number;
  barColor?: string;
}

function AnimatedBar({
  label,
  value,
  maxValue,
  index,
  labelWidth = 20,
  barColor = colors.pitchGreen,
}: AnimatedBarProps) {
  const targetPercent = maxValue > 0 ? Math.max((value / maxValue) * 100, 8) : 8;
  const widthProgress = useSharedValue(0);

  useEffect(() => {
    widthProgress.value = withDelay(index * 80, withTiming(targetPercent, { duration: 600 }));
  }, [targetPercent, index, widthProgress]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${widthProgress.value}%` as unknown as number,
  }));

  return (
    <View style={styles.row}>
      <Text style={[styles.label, { width: labelWidth }]} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.barContainer}>
        <Animated.View
          style={[
            styles.bar,
            shadows.neonGlow,
            { backgroundColor: barColor, borderRightColor: '#00FF87' },
            animatedStyle,
          ]}>
          <Text style={styles.valueText}>{value}</Text>
        </Animated.View>
      </View>
    </View>
  );
}

export default React.memo(AnimatedBar);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    textAlign: 'center',
    fontSize: 12,
    fontFamily: fonts.scoreboard,
    color: colors.chalkWhite,
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
  valueText: {
    fontSize: 12,
    fontFamily: fonts.scoreboard,
    color: colors.chalkWhite,
  },
});
