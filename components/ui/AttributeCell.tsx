import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';

import { AttributeStatus } from '@/types/game';
import { fonts, borderRadius as br, spacing, type } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';

interface AttributeCellProps {
  label: string;
  value: string;
  status: AttributeStatus;
  delay?: number;
}

const statusIcons: Record<AttributeStatus, string> = {
  CORRECT: '',
  WRONG: '',
  HIGHER: ' ↑',
  LOWER: ' ↓',
};

function AttributeCell({ value, status, delay = 0 }: AttributeCellProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const statusColors: Record<AttributeStatus, string> = useMemo(
    () => ({
      CORRECT: colors.accent,
      WRONG: colors.bgCardPressed,
      HIGHER: colors.streak,
      LOWER: colors.streak,
    }),
    [colors],
  );

  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withDelay(delay, withTiming(180, { duration: 400 }));
  }, [delay, rotation]);

  const frontStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(rotation.value, [0, 180], [0, 180], Extrapolation.CLAMP);
    return {
      transform: [{ perspective: 800 }, { rotateY: `${rotateY}deg` }],
      opacity: rotateY < 90 ? 1 : 0,
    };
  });

  const backStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(rotation.value, [0, 180], [180, 360], Extrapolation.CLAMP);
    return {
      transform: [{ perspective: 800 }, { rotateY: `${rotateY}deg` }],
      opacity: rotation.value > 90 ? 1 : 0,
    };
  });

  return (
    <View style={layout.wrapper}>
      {/* Front face (neutral dark) */}
      <Animated.View style={[layout.pill, styles.front, frontStyle]}>
        <Text style={styles.hiddenText}>?</Text>
      </Animated.View>

      {/* Back face (colored result) */}
      <Animated.View style={[layout.pill, { backgroundColor: statusColors[status] }, backStyle]}>
        <Text
          style={styles.valueText}
          adjustsFontSizeToFit
          minimumFontScale={0.65}
          numberOfLines={2}>
          {value}
          {statusIcons[status]}
        </Text>
      </Animated.View>
    </View>
  );
}

export default React.memo(AttributeCell);

const layout = StyleSheet.create({
  wrapper: {
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pill: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 64,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    borderRadius: br.md,
    alignItems: 'center',
    justifyContent: 'center',
    backfaceVisibility: 'hidden',
  },
});

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    front: {
      backgroundColor: c.bgElevated,
      borderWidth: 1,
      borderColor: c.border,
    },
    hiddenText: {
      ...type.micro,
      fontFamily: fonts.mono,
      color: c.textMuted,
      textAlign: 'center',
    },
    valueText: {
      ...type.captionBold,
      fontFamily: fonts.subheading,
      color: c.textPrimary,
      textAlign: 'center',
      letterSpacing: 0.5,
    },
  });
