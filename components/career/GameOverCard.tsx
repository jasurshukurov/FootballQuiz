import React, { useEffect, useMemo } from 'react';
import { Image, StyleSheet, Text } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import GlassCard from '@/components/ui/GlassCard';
import RetroButton from '@/components/ui/RetroButton';
import { type, spacing, borderRadius, motion } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';

interface GameOverCardProps {
  playerName: string;
  playerImage?: string;
  isWin: boolean;
  onNextPlayer: () => void;
}

function GameOverCard({ playerName, playerImage, isWin, onNextPlayer }: GameOverCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  // Short settle only — this card re-mounts on every visit to a completed
  // daily, and a long slide re-running each time reads as "jumping".
  const translateY = useSharedValue(16);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const timingConfig = { duration: motion.slow, easing: Easing.out(Easing.cubic) };
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
        <Text style={[styles.result, { color: isWin ? colors.accent : colors.danger }]}>
          {isWin ? 'Correct!' : 'Game Over'}
        </Text>

        {playerImage ? <Image source={{ uri: playerImage }} style={styles.image} /> : null}

        <Text style={styles.playerName}>{playerName}</Text>

        <RetroButton title="Next Player" onPress={onNextPlayer} />
      </GlassCard>
    </Animated.View>
  );
}

export default React.memo(GameOverCard);

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    card: {
      paddingVertical: spacing.xl,
      paddingHorizontal: spacing.lg,
      gap: spacing.md,
      alignItems: 'center',
    },
    result: {
      ...type.h1,
      textTransform: 'uppercase',
      letterSpacing: 2,
    },
    image: {
      width: 80,
      height: 80,
      borderRadius: borderRadius.full,
      borderWidth: 2,
      borderColor: c.borderStrong,
    },
    playerName: {
      ...type.h2,
      color: c.textPrimary,
      textAlign: 'center',
    },
  });
