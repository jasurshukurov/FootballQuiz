import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import GlassCard from '@/components/ui/GlassCard';
import TeamCrest from '@/components/ui/TeamCrest';
import Tappable from '@/components/ui/Tappable';
import { Player } from '@/types/player';
import { SlotStatus } from '@/lib/blindRankingGenerator';
import { type, spacing, borderRadius, motion } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';

interface RankSlotProps {
  rank: number;
  player: Player | null;
  onPress: () => void;
  disabled: boolean;
  isRevealing: boolean;
  /** Reveal outcome for this slot: exact (green), adjacent (amber), wrong (red). */
  status?: SlotStatus;
  /** Muted end-anchor tag (e.g. "Most expensive" on #1, "Cheapest" on #5). */
  endLabel?: string;
}

export default function RankSlot({
  rank,
  player,
  onPress,
  disabled,
  isRevealing,
  status,
  endLabel,
}: RankSlotProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const scale = useSharedValue(1);
  const shakeX = useSharedValue(0);
  const borderColorProgress = useSharedValue(0);

  useEffect(() => {
    if (player) {
      // v3 motion: eased settle, no bouncy overshoot.
      scale.value = 0.94;
      scale.value = withTiming(1, { duration: motion.base, easing: Easing.out(Easing.cubic) });
    }
    // Keyed on the id, not the object: the pop must replay only when a
    // different player fills the slot, not on re-renders with a fresh ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player?.id, scale]);

  const revealColor =
    status === 'exact' ? colors.accent : status === 'adjacent' ? colors.streak : colors.danger;

  useEffect(() => {
    if (isRevealing && status !== undefined) {
      borderColorProgress.value = withTiming(1, { duration: 300 });
      if (status === 'wrong') {
        shakeX.value = withSequence(
          withTiming(-6, { duration: 50 }),
          withTiming(6, { duration: 50 }),
          withTiming(-4, { duration: 50 }),
          withTiming(4, { duration: 50 }),
          withTiming(0, { duration: 80 }),
        );
      }
    }
  }, [isRevealing, status, borderColorProgress, shakeX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateX: shakeX.value }],
  }));

  const borderStyle = useAnimatedStyle(() => {
    if (!isRevealing || status === undefined) {
      return { borderColor: player ? colors.border : colors.accentBorder };
    }
    return {
      borderColor: revealColor,
      borderWidth: 2,
    };
  }, [isRevealing, status, player, colors, revealColor]);

  if (!player) {
    return (
      <Tappable
        onPress={onPress}
        disabled={disabled}
        hoverStyle={{ backgroundColor: colors.bgCardPressed, borderRadius: borderRadius.lg }}>
        <Animated.View style={[styles.emptySlot, borderStyle]}>
          <Text style={styles.rankNumber}>#{rank}</Text>
          <Text style={styles.tapText}>Tap to place</Text>
          {endLabel ? (
            <Text style={[styles.endLabel, styles.endLabelAbsolute]}>{endLabel}</Text>
          ) : null}
        </Animated.View>
      </Tappable>
    );
  }

  return (
    <Tappable onPress={onPress} disabled={disabled} haptic="none">
      <Animated.View style={[animatedStyle]}>
        <Animated.View style={[styles.filledSlot, borderStyle]}>
          <GlassCard style={layoutStyles.innerCard}>
            <View style={layoutStyles.content}>
              <Text style={styles.rankBadge}>#{rank}</Text>
              <TeamCrest teamName={player.current_team} size={18} />
              <Text style={styles.playerName} numberOfLines={1}>
                {player.name}
              </Text>
              {isRevealing && status !== undefined ? (
                <Text style={[styles.resultIcon, { color: revealColor }]}>
                  {status === 'exact' ? '✓' : status === 'adjacent' ? '≈' : '✗'}
                </Text>
              ) : endLabel ? (
                <Text style={styles.endLabel}>{endLabel}</Text>
              ) : null}
            </View>
          </GlassCard>
        </Animated.View>
      </Animated.View>
    </Tappable>
  );
}

// Layout-only styles stay module-scope.
const layoutStyles = StyleSheet.create({
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
});

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    emptySlot: {
      height: 52,
      borderRadius: borderRadius.lg,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: c.accentBorder,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    rankNumber: {
      ...type.score,
      color: c.accent,
    },
    tapText: {
      ...type.caption,
      color: c.textSecondary,
    },
    filledSlot: {
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: c.border,
      marginBottom: spacing.sm,
      overflow: 'hidden',
    },
    rankBadge: {
      ...type.score,
      color: c.accent,
      width: 28,
    },
    playerName: {
      flex: 1,
      ...type.bodyBold,
      color: c.textPrimary,
    },
    resultIcon: {
      ...type.h3,
    },
    // Muted micro end-anchor ("Most expensive" / "Cheapest"). In the filled row
    // it sits inline at the trailing edge; in the empty row it is pinned right
    // so the "#N · Tap to place" content stays centered.
    endLabel: {
      ...type.micro,
      color: c.textMuted,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    endLabelAbsolute: {
      position: 'absolute',
      right: spacing.md,
    },
  });
