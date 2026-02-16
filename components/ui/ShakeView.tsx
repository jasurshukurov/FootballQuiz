import React, { useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

interface ShakeViewProps {
  shake: boolean;
  children: React.ReactNode;
}

export default function ShakeView({ shake, children }: ShakeViewProps) {
  const translateX = useSharedValue(0);

  useEffect(() => {
    if (shake) {
      translateX.value = withSequence(
        withTiming(-8, { duration: 60 }),
        withTiming(8, { duration: 60 }),
        withTiming(-6, { duration: 60 }),
        withTiming(6, { duration: 60 }),
        withTiming(-3, { duration: 60 }),
        withTiming(0, { duration: 100 }),
      );
    }
  }, [shake, translateX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}
