import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { borderRadius, spacing, type } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';
import { useDailyStateStore } from '@/hooks/useDailyStateStore';
import { getNextUnplayedMode } from '@/lib/modeRegistry';
import Confetti from '@/components/ui/Confetti';
import StreakBadge from '@/components/ui/StreakBadge';
import NextPuzzleCountdown from '@/components/ui/NextPuzzleCountdown';
import Tappable from '@/components/ui/Tappable';

interface GameOverExtrasProps {
  /** Fire the confetti burst (true on a genuine win/strong result). */
  win: boolean;
  /** The mode just finished — excluded from the "Next up" suggestion. */
  currentModeKey?: string;
  /** Hide the streak badge when the host surface renders its own
   *  (GameOverSheet places it above the action row per the design). */
  showStreak?: boolean;
  /** Hide the confetti when the host surface fires its own at overlay level. */
  showConfetti?: boolean;
  /** Called right before "Next up" navigates — hosts that live inside a Modal
   *  MUST close it here, or the sheet stays painted over the next screen
   *  (RN Modals sit above the navigator). */
  onNavigate?: () => void;
}

/** The shared game-over flourish: confetti on a win, the current streak badge,
 *  a "Next up" CTA routing to the next unplayed mode (or a perfect-day note
 *  when the day is complete), and the live countdown to the next daily puzzle.
 *  Drop one of these into each mode's completed/game-over state. */
export default function GameOverExtras({
  win,
  currentModeKey,
  showStreak = true,
  showConfetti = true,
  onNavigate,
}: GameOverExtrasProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const streak = useDailyStateStore((s) => s.currentStreak);
  const nextMode = getNextUnplayedMode(currentModeKey);

  return (
    <>
      {win && showConfetti && <Confetti intensity="high" />}
      <View style={layout.stack}>
        {showStreak && <StreakBadge streak={streak} />}
        {nextMode ? (
          <Tappable
            onPress={() => {
              onNavigate?.();
              router.push(nextMode.route as Href);
            }}
            hitSlop={0}
            hoverStyle={{ backgroundColor: colors.bgCardPressed }}
            style={({ pressed }) => [styles.nextUp, pressed && styles.nextUpPressed]}>
            <View style={styles.nextUpIcon}>
              <FontAwesome name={nextMode.icon} size={18} color={colors.accent} />
            </View>
            <View style={layout.nextUpText}>
              <Text style={styles.nextUpLabel}>NEXT UP</Text>
              <Text style={styles.nextUpTitle} numberOfLines={1}>
                {nextMode.title}
              </Text>
            </View>
            <FontAwesome name="chevron-right" size={14} color={colors.textSecondary} />
          </Tappable>
        ) : (
          <View style={layout.perfectDay}>
            <FontAwesome name="check-circle" size={16} color={colors.accent} />
            <Text style={styles.perfectDayText}>All done for today</Text>
          </View>
        )}
        <NextPuzzleCountdown />
      </View>
    </>
  );
}

const layout = StyleSheet.create({
  stack: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  nextUpText: {
    flex: 1,
  },
  perfectDay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    nextUp: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'stretch',
      minHeight: 56,
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: c.accentBorder,
      backgroundColor: c.accentSoft,
    },
    nextUpPressed: {
      backgroundColor: c.bgCardPressed,
    },
    nextUpIcon: {
      width: 36,
      height: 36,
      borderRadius: borderRadius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.bgCard,
    },
    nextUpLabel: {
      ...type.micro,
      color: c.accent,
      letterSpacing: 1.5,
    },
    nextUpTitle: {
      ...type.bodyBold,
      color: c.textPrimary,
      marginTop: 2,
    },
    perfectDayText: {
      ...type.caption,
      color: c.textSecondary,
    },
  });
