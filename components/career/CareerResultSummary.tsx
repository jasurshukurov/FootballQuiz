import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { spacing, type } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';
import { Rank } from '@/lib/rankLadder';
import RankBadge from '@/components/ui/RankBadge';
import { SolveTimeResult } from '@/components/ui/SolveTimeChip';
import StreakFlame from '@/components/ui/StreakFlame';

// Number rolls up over roughly this long — a beat of anticipation, no more.
const XP_COUNT_MS = 900;

/** Cubic ease-out count-up driven by requestAnimationFrame (web-safe). Jumps
 *  straight to the target when animation is disabled or reduced. */
function useCountUp(target: number, animate: boolean): number {
  const reduceMotion = useReducedMotion();
  const [value, setValue] = useState(() => (animate ? 0 : target));

  useEffect(() => {
    if (!animate || reduceMotion) {
      setValue(target);
      return;
    }
    let raf = 0;
    const start = Date.now();
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / XP_COUNT_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, animate, reduceMotion]);

  return value;
}

interface CareerResultSummaryProps {
  clueRank: Rank;
  /** Guesses spent plus hints unlocked. */
  cluesUsed: number;
  xpEarned: number;
  /** Count the XP up from zero. False on practice replays (nothing awarded). */
  animateXp: boolean;
  streak: number;
  playedCount: number;
  totalCount: number;
}

/**
 * The two-column game-over summary: TODAY'S RESULT (rank + solve time + clues)
 * beside YOUR PROGRESSION (XP earned + streak + daily progress). Stacks to a
 * single column when the row can't fit ~430px.
 */
export default function CareerResultSummary({
  clueRank,
  cluesUsed,
  xpEarned,
  animateXp,
  streak,
  playedCount,
  totalCount,
}: CareerResultSummaryProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [narrow, setNarrow] = useState(false);
  const xp = useCountUp(xpEarned, animateXp);

  const onLayout = (e: LayoutChangeEvent) => {
    setNarrow(e.nativeEvent.layout.width < 430);
  };

  return (
    <View
      style={[styles.row, narrow ? styles.rowStacked : styles.rowSideBySide]}
      onLayout={onLayout}>
      <View style={styles.column}>
        <Text style={styles.sectionLabel}>Today&apos;s result</Text>
        <RankBadge rank={clueRank} unit="clues" />
        <SolveTimeResult mode="careerpath" />
        <Text style={styles.caption}>
          {cluesUsed} {cluesUsed === 1 ? 'clue' : 'clues'} used
        </Text>
      </View>

      <View style={styles.column}>
        <Text style={styles.sectionLabel}>Your progression</Text>
        <Text style={styles.xp}>+{xp} XP</Text>
        <View style={styles.streakRow}>
          <StreakFlame size={18} color={colors.streak} />
          <Text style={styles.streakText}>{streak}</Text>
        </View>
        <Text style={styles.caption}>
          {playedCount}/{totalCount} played
        </Text>
      </View>
    </View>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    row: {
      alignSelf: 'stretch',
      gap: spacing.md,
      marginTop: spacing.md,
    },
    rowSideBySide: {
      flexDirection: 'row',
    },
    rowStacked: {
      flexDirection: 'column',
    },
    column: {
      flex: 1,
      alignItems: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.sm,
    },
    sectionLabel: {
      ...type.micro,
      textTransform: 'uppercase',
      letterSpacing: 1.5,
      color: c.textMuted,
    },
    caption: {
      ...type.caption,
      color: c.textSecondary,
    },
    xp: {
      ...type.scoreLarge,
      color: c.accent,
      marginVertical: spacing.xs,
    },
    streakRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    streakText: {
      ...type.score,
      color: c.streak,
    },
  });
