import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { spacing, borderRadius, type } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';
import { Rank } from '@/lib/rankLadder';

interface RankBadgeProps {
  rank: Rank;
  /** Unit for the "to next" line, e.g. "answers", "points", "wins". */
  unit?: string;
}

/**
 * Universal result rank: the label is the loudest element, with the path to
 * the next rank always visible (goal-gradient). Top tier gets amber plus a
 * subtle streak-colored glow.
 */
export default function RankBadge({ rank, unit = 'more' }: RankBadgeProps) {
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isTop = rank.nextLabel === null;

  // Theme glow recipe re-tinted to the streak (amber) color for the top tier.
  const topGlow = useMemo(
    () => ({ ...shadows.neonGlow, shadowColor: colors.streak }),
    [shadows, colors],
  );

  return (
    <View style={[styles.container, isTop && styles.containerTop, isTop && topGlow]}>
      <Text style={[styles.label, isTop && styles.labelTop]}>{rank.label.toUpperCase()}</Text>
      {rank.nextLabel ? (
        <Text style={styles.next}>
          {rank.toNext} {rank.toNext === 1 && unit.endsWith('s') ? unit.slice(0, -1) : unit} to{' '}
          {rank.nextLabel}
        </Text>
      ) : (
        <Text style={styles.next}>Top of the ladder</Text>
      )}
    </View>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: {
      alignSelf: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.lg,
      backgroundColor: c.accentSoft,
      borderWidth: 1,
      borderColor: c.accentBorder,
      marginVertical: spacing.sm,
    },
    containerTop: {
      backgroundColor: c.streakSoft,
      borderColor: c.streak,
    },
    label: {
      ...type.h2,
      color: c.accentBright,
      letterSpacing: 1,
    },
    labelTop: {
      color: c.streakBright,
    },
    next: {
      ...type.caption,
      color: c.textSecondary,
      marginTop: 2,
    },
  });
