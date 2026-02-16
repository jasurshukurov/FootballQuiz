import React, { useEffect } from 'react';
import { Image, StyleSheet, Text } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import GlassCard from '@/components/ui/GlassCard';
import RetroButton from '@/components/ui/RetroButton';
import { colors, fonts, spacing } from '@/constants/theme';

interface GameOverCardProps {
  playerName: string;
  playerImage?: string;
  isWin: boolean;
  onNextPlayer: () => void;
}

function GameOverCard({
  playerName,
  playerImage,
  isWin,
  onNextPlayer,
}: GameOverCardProps) {
  const translateY = useSharedValue(50);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const timingConfig = { duration: 400, easing: Easing.out(Easing.cubic) };
    translateY.value = withTiming(0, timingConfig);
    opacity.value = withTiming(1, timingConfig);
  }, [translateY, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={animatedStyle}>
      <GlassCard style={styles.card}>
        <Text style={[styles.result, { color: isWin ? colors.pitchGreen : colors.cardRed }]}>
          {isWin ? 'Correct!' : 'Game Over'}
        </Text>

        {playerImage ? (
          <Image source={{ uri: playerImage }} style={styles.image} />
        ) : null}

        <Text style={styles.playerName}>{playerName}</Text>

        <RetroButton title="Next Player" onPress={onNextPlayer} />
      </GlassCard>
    </Animated.View>
  );
}

export default React.memo(GameOverCard);

const styles = StyleSheet.create({
  card: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    alignItems: 'center',
  },
  result: {
    fontSize: 28,
    fontFamily: fonts.heading,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: colors.chalkWhite,
  },
  playerName: {
    fontSize: 22,
    fontFamily: fonts.subheading,
    color: colors.chalkWhite,
    textAlign: 'center',
  },
});
