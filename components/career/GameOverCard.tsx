import React, { useEffect, useMemo } from 'react';
import { Image, StyleSheet, Text } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import GlassCard from '@/components/ui/GlassCard';
import { type, spacing, borderRadius, motion } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';

interface GameOverCardProps {
  playerName: string;
  playerImage?: string;
  /** Answer meta shown as "nationality · position"; each part omitted if empty. */
  nationality?: string;
  position?: string;
  isWin: boolean;
}

function GameOverCard({
  playerName,
  playerImage,
  nationality,
  position,
  isWin,
}: GameOverCardProps) {
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

  // Loss keeps a neutral, non-shaming verdict; the answer reveal is the payoff.
  const meta = [nationality, position].filter((p) => p && p.trim().length > 0).join('  ·  ');

  return (
    <Animated.View style={animatedStyle}>
      <GlassCard style={styles.card}>
        <Text style={[styles.verdict, { color: isWin ? colors.accent : colors.textPrimary }]}>
          {isWin ? 'CORRECT!' : 'FULL TIME'}
        </Text>

        {playerImage ? <Image source={{ uri: playerImage }} style={styles.image} /> : null}

        <Text style={styles.playerName}>{playerName}</Text>

        {meta.length > 0 ? <Text style={styles.meta}>{meta}</Text> : null}
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
      gap: spacing.sm,
      alignItems: 'center',
    },
    verdict: {
      ...type.h2,
      textTransform: 'uppercase',
      letterSpacing: 2,
    },
    image: {
      width: 80,
      height: 80,
      borderRadius: borderRadius.full,
      borderWidth: 2,
      borderColor: c.borderStrong,
      marginTop: spacing.xs,
    },
    playerName: {
      ...type.h1,
      color: c.textPrimary,
      textAlign: 'center',
      marginTop: spacing.xs,
    },
    meta: {
      ...type.caption,
      color: c.textSecondary,
      textAlign: 'center',
    },
  });
