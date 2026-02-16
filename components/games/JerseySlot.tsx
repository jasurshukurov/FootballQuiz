import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import PopInView from '@/components/ui/PopInView';
import ShakeView from '@/components/ui/ShakeView';
import { colors, fonts } from '@/constants/theme';

interface JerseySlotProps {
  playerName?: string;
  revealed: boolean;
  shaking: boolean;
  position: string;
  jerseyColor: string;
  onPress: () => void;
}

function PulsingQuestion() {
  const opacity = useSharedValue(1);

  React.useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.3, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return <Animated.Text style={[styles.questionMark, animatedStyle]}>?</Animated.Text>;
}

export default function JerseySlot({
  playerName,
  revealed,
  shaking,
  position,
  jerseyColor,
  onPress,
}: JerseySlotProps) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <ShakeView shake={shaking}>
      <Pressable onPress={handlePress} disabled={revealed} style={styles.slotWrapper}>
        {revealed && playerName ? (
          <PopInView>
            <View style={[styles.revealedCircle, { backgroundColor: jerseyColor }]} />
            <Text style={styles.playerName} numberOfLines={2} adjustsFontSizeToFit>
              {playerName}
            </Text>
          </PopInView>
        ) : (
          <View style={styles.unrevealedCircle}>
            <PulsingQuestion />
          </View>
        )}
        <Text style={styles.positionLabel}>{position}</Text>
      </Pressable>
    </ShakeView>
  );
}

const styles = StyleSheet.create({
  slotWrapper: {
    alignItems: 'center',
    width: 64,
  },
  unrevealedCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(255,255,255,0.3)',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 8,
    shadowOpacity: 0.5,
    elevation: 4,
  },
  revealedCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    alignSelf: 'center',
  },
  questionMark: {
    fontSize: 20,
    fontFamily: fonts.heading,
    color: colors.chalkWhite,
    textAlign: 'center',
  },
  playerName: {
    fontSize: 9,
    fontFamily: fonts.subheading,
    color: colors.chalkWhite,
    textAlign: 'center',
    marginTop: 2,
    paddingHorizontal: 2,
  },
  positionLabel: {
    marginTop: 2,
    fontSize: 8,
    fontFamily: fonts.subheading,
    color: colors.chalkWhite,
    textTransform: 'uppercase',
    opacity: 0.7,
  },
});
