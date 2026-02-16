import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors, fonts, borderRadius } from '@/constants/theme';

interface ConnectionsTileProps {
  name: string;
  selected: boolean;
  solved: boolean;
  solvedColor?: string;
  onPress: () => void;
  disabled: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function ConnectionsTile({
  name,
  selected,
  solved,
  solvedColor,
  onPress,
  disabled,
}: ConnectionsTileProps) {
  const scale = useSharedValue(1);
  const borderWidthVal = useSharedValue(1);
  const elevationVal = useSharedValue(0);

  useEffect(() => {
    const ease = { duration: 200, easing: Easing.out(Easing.cubic) };
    if (selected) {
      borderWidthVal.value = withTiming(2.5, ease);
      elevationVal.value = withTiming(12, ease);
      scale.value = withTiming(1.03, ease);
    } else {
      borderWidthVal.value = withTiming(1, { duration: 150 });
      elevationVal.value = withTiming(0, { duration: 150 });
      scale.value = withTiming(1, { duration: 150 });
    }
  }, [selected, borderWidthVal, elevationVal, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    borderWidth: borderWidthVal.value,
    borderColor: selected ? colors.pitchGreen : 'rgba(255,255,255,0.12)',
    shadowColor: selected ? '#05F26C' : '#000',
    shadowOffset: { width: 0, height: selected ? 0 : 2 },
    shadowOpacity: selected ? 0.5 : 0.2,
    shadowRadius: selected ? 10 : 4,
    elevation: elevationVal.value,
  }));

  const handlePressIn = () => {
    scale.value = withTiming(0.96, { duration: 100, easing: Easing.out(Easing.quad) });
  };

  const handlePressOut = () => {
    scale.value = withTiming(selected ? 1.03 : 1, { duration: 150, easing: Easing.out(Easing.quad) });
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  if (solved) {
    return (
      <View style={[styles.tile, styles.solvedTile, { backgroundColor: solvedColor }]}>
        <Text style={styles.tileText} adjustsFontSizeToFit minimumFontScale={0.7} numberOfLines={2}>
          {name}
        </Text>
      </View>
    );
  }

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[styles.tile, selected ? styles.selectedBg : styles.defaultBg, animatedStyle]}>
      <Text style={[styles.tileText, selected && styles.selectedText]} adjustsFontSizeToFit minimumFontScale={0.7} numberOfLines={2}>
        {name}
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    paddingHorizontal: 4,
  },
  defaultBg: {
    backgroundColor: 'rgba(17,17,40,0.85)',
  },
  selectedBg: {
    backgroundColor: 'rgba(5,242,108,0.15)',
  },
  solvedTile: {
    borderWidth: 0,
  },
  tileText: {
    fontSize: 12,
    fontFamily: fonts.subheading,
    color: colors.chalkWhite,
    textAlign: 'center',
  },
  selectedText: {
    color: colors.pitchGreen,
  },
});
