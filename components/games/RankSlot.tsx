import React, { useEffect } from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import GlassCard from '@/components/ui/GlassCard';
import TeamCrest from '@/components/ui/TeamCrest';
import { Player } from '@/types/player';
import { colors, fonts, spacing, borderRadius } from '@/constants/theme';

interface RankSlotProps {
  rank: number;
  player: Player | null;
  onPress: () => void;
  disabled: boolean;
  isRevealing: boolean;
  isCorrect?: boolean;
}

export default function RankSlot({
  rank,
  player,
  onPress,
  disabled,
  isRevealing,
  isCorrect,
}: RankSlotProps) {
  const scale = useSharedValue(1);
  const shakeX = useSharedValue(0);
  const borderColorProgress = useSharedValue(0);

  useEffect(() => {
    if (player) {
      scale.value = withSpring(1, { damping: 12, stiffness: 150, mass: 0.8 });
    }
  }, [player, scale]);

  useEffect(() => {
    if (player) {
      scale.value = 0.9;
      scale.value = withSpring(1, { damping: 12, stiffness: 150 });
    }
  }, [player?.id]);

  useEffect(() => {
    if (isRevealing && isCorrect !== undefined) {
      borderColorProgress.value = withTiming(1, { duration: 300 });
      if (!isCorrect) {
        shakeX.value = withSequence(
          withTiming(-6, { duration: 50 }),
          withTiming(6, { duration: 50 }),
          withTiming(-4, { duration: 50 }),
          withTiming(4, { duration: 50 }),
          withTiming(0, { duration: 80 }),
        );
      }
    }
  }, [isRevealing, isCorrect, borderColorProgress, shakeX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateX: shakeX.value }],
  }));

  const borderStyle = useAnimatedStyle(() => {
    if (!isRevealing || isCorrect === undefined) {
      return { borderColor: player ? colors.glassBorder : colors.neonGlow };
    }
    const color = isCorrect ? '#52B788' : '#E63946';
    return {
      borderColor: color,
      borderWidth: 2,
    };
  });

  if (!player) {
    return (
      <Pressable onPress={onPress} disabled={disabled}>
        <Animated.View style={[styles.emptySlot, borderStyle]}>
          <Text style={styles.rankNumber}>#{rank}</Text>
          <Text style={styles.tapText}>Tap to place</Text>
        </Animated.View>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onPress} disabled={disabled}>
      <Animated.View style={[animatedStyle]}>
        <Animated.View style={[styles.filledSlot, borderStyle]}>
          <GlassCard style={styles.innerCard}>
            <View style={styles.content}>
              <Text style={styles.rankBadge}>#{rank}</Text>
              <TeamCrest teamName={player.current_team} size={18} />
              <Text style={styles.playerName} numberOfLines={1}>
                {player.name}
              </Text>
              {isRevealing && isCorrect !== undefined && (
                <Text style={[styles.resultIcon, isCorrect ? styles.correct : styles.wrong]}>
                  {isCorrect ? '\u2713' : '\u2717'}
                </Text>
              )}
            </View>
          </GlassCard>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  emptySlot: {
    height: 52,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.neonGlow,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  rankNumber: {
    fontFamily: fonts.scoreboard,
    fontSize: 16,
    color: colors.pitchGreen,
  },
  tapText: {
    fontFamily: fonts.subheading,
    fontSize: 13,
    color: colors.steelGray,
  },
  filledSlot: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  innerCard: {
    borderRadius: 0,
    borderWidth: 0,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  rankBadge: {
    fontFamily: fonts.scoreboard,
    fontSize: 14,
    color: colors.pitchGreen,
    width: 28,
  },
  playerName: {
    flex: 1,
    fontFamily: fonts.subheading,
    fontSize: 15,
    color: colors.chalkWhite,
  },
  resultIcon: {
    fontFamily: fonts.heading,
    fontSize: 18,
  },
  correct: {
    color: colors.matchGreen,
  },
  wrong: {
    color: colors.cardRed,
  },
});
