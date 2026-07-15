import React, { useEffect } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

interface StreakFlameProps {
  size: number;
  color: string;
}

/**
 * The streak flame icon with the v3 continuous subtle flicker (gentle
 * scale/rotate loop, ~2.4s). Static under reduced motion. Swap the innards
 * for a Lottie flame later without touching call sites.
 */
export default function StreakFlame({ size, color }: StreakFlameProps) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    const ease = Easing.inOut(Easing.quad);
    scale.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 600, easing: ease }),
        withTiming(0.97, { duration: 600, easing: ease }),
        withTiming(1.03, { duration: 600, easing: ease }),
        withTiming(1, { duration: 600, easing: ease }),
      ),
      -1,
    );
    rotate.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: 800, easing: ease }),
        withTiming(4, { duration: 800, easing: ease }),
        withTiming(0, { duration: 800, easing: ease }),
      ),
      -1,
    );
  }, [reduceMotion, scale, rotate]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotate.value}deg` }],
  }));

  return (
    <Animated.View style={style}>
      <FontAwesome name="fire" size={size} color={color} />
    </Animated.View>
  );
}
