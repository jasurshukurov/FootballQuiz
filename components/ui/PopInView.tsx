import React, { useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  Easing,
} from 'react-native-reanimated';

import { motion } from '@/constants/theme';

interface PopInViewProps {
  children: React.ReactNode;
  delay?: number;
}

export default function PopInView({ children, delay = 0 }: PopInViewProps) {
  // Gentle settle: start near full size and fade in. A 0→1 bouncy spring
  // reads as "jumping" — deliberately avoided app-wide.
  const scale = useSharedValue(0.96);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(delay, withSpring(1, motion.spring));
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: motion.base, easing: Easing.out(Easing.quad) }),
    );
  }, [delay, scale, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}
