import React, { useCallback, useState } from 'react';
import { Insets, Platform, Pressable, StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { motion } from '@/constants/theme';
import { triggerImpact, triggerNotification } from '@/lib/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type TappableHaptic = 'impact' | 'success' | 'none';

export interface TappableState {
  pressed: boolean;
  hovered: boolean;
}

export interface TappableProps {
  onPress: () => void;
  children?: React.ReactNode;
  /** Haptic fired on press: light impact (default), success notification, or none. */
  haptic?: TappableHaptic;
  disabled?: boolean;
  /** Static style, or a function of { pressed, hovered } for state-driven styling. */
  style?: StyleProp<ViewStyle> | ((state: TappableState) => StyleProp<ViewStyle>);
  /** Applied while hovered on web. Cards should pass { backgroundColor: colors.bgCardPressed }. */
  hoverStyle?: StyleProp<ViewStyle>;
  /**
   * Extends the touchable area beyond the layout box. Defaults to 8pt on every
   * side so compact controls still approach `touch.min` (44pt); pass 0 to opt out.
   */
  hitSlop?: number | Insets;
  accessibilityLabel?: string;
  testID?: string;
}

/**
 * THE pressable primitive for the whole app. Wraps Pressable with a
 * reanimated press-scale spring (0.97), themable hover support on web,
 * cursor:pointer, and haptic feedback via lib/haptics.
 *
 * All new touchables use Tappable — never raw Pressable/TouchableOpacity
 * unless a style-function edge case genuinely requires it.
 */
export default function Tappable({
  onPress,
  children,
  haptic = 'impact',
  disabled = false,
  style,
  hoverStyle,
  hitSlop = 8,
  accessibilityLabel,
  testID,
}: TappableProps) {
  const scale = useSharedValue(1);
  const [pressed, setPressed] = useState(false);
  const [hovered, setHovered] = useState(false);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    setPressed(true);
    scale.value = withSpring(0.97, motion.spring);
  }, [scale]);

  const handlePressOut = useCallback(() => {
    setPressed(false);
    scale.value = withSpring(1, motion.spring);
  }, [scale]);

  const handlePress = useCallback(() => {
    if (haptic === 'impact') {
      triggerImpact();
    } else if (haptic === 'success') {
      triggerNotification(Haptics.NotificationFeedbackType.Success);
    }
    onPress();
  }, [haptic, onPress]);

  const resolvedStyle = typeof style === 'function' ? style({ pressed, hovered }) : style;

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      testID={testID}
      disabled={disabled}
      hitSlop={hitSlop}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={[
        webCursor,
        resolvedStyle,
        hovered && !disabled ? hoverStyle : undefined,
        animatedStyle,
      ]}>
      {children}
    </AnimatedPressable>
  );
}

const webCursor: ViewStyle | undefined =
  Platform.OS === 'web' ? ({ cursor: 'pointer' } as ViewStyle) : undefined;
