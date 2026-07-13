import React, { useEffect } from 'react';
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
import { colors, fonts, borderRadius as br } from '@/constants/theme';

interface AttributeCellProps {
  label: string;
  value: string;
  status: AttributeStatus;
  delay?: number;
}

const statusColors: Record<AttributeStatus, string> = {
  CORRECT: '#52B788',
  WRONG: 'rgba(108,117,125,0.5)',
  HIGHER: '#F4A261',
  LOWER: '#F4A261',
};

const statusIcons: Record<AttributeStatus, string> = {
  CORRECT: '',
  WRONG: '',
  HIGHER: ' \u2191',
  LOWER: ' \u2193',
};

function AttributeCell({ value, status, delay = 0 }: AttributeCellProps) {
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
    <View style={styles.wrapper}>
      {/* Front face (neutral dark) */}
      <Animated.View style={[styles.pill, styles.front, frontStyle]}>
        <Text style={styles.hiddenText}>?</Text>
      </Animated.View>

      {/* Back face (colored result) */}
      <Animated.View style={[styles.pill, { backgroundColor: statusColors[status] }, backStyle]}>
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

const styles = StyleSheet.create({
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
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: br.md,
    alignItems: 'center',
    justifyContent: 'center',
    backfaceVisibility: 'hidden',
  },
  front: {
    backgroundColor: 'rgba(17,17,40,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  hiddenText: {
    fontFamily: fonts.scoreboard,
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
  },
  valueText: {
    fontFamily: fonts.heading,
    fontSize: 13,
    fontWeight: '700',
    color: colors.chalkWhite,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});
