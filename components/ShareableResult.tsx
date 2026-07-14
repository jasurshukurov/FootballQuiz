import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';

import { GuessResult, AttributeStatus } from '@/types/game';
import { spacing, borderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { whoAreYaStatusRows } from '@/lib/shareText';
import ShareCardShell from '@/components/ShareCardShell';

interface ShareableResultProps {
  dailyNumber: number;
  guesses: GuessResult[];
  maxGuesses: number;
  won: boolean;
}

export default function ShareableResult({
  dailyNumber,
  guesses,
  maxGuesses,
  won,
}: ShareableResultProps) {
  const { colors } = useTheme();
  const statusColors: Record<AttributeStatus, string> = useMemo(
    () => ({
      CORRECT: colors.accent,
      HIGHER: colors.streak,
      LOWER: colors.streak,
      WRONG: colors.textMuted,
    }),
    [colors],
  );
  const statusRows = useMemo(() => whoAreYaStatusRows(guesses), [guesses]);

  return (
    <ShareCardShell
      title="My Name Is…"
      dailyNumber={dailyNumber}
      verdict={won ? `GOT IT IN ${guesses.length}/${maxGuesses}` : `X/${maxGuesses}`}
      won={won}>
      <View style={styles.grid}>
        {statusRows.map((statuses, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {statuses.map((status, colIndex) => (
              <View
                key={colIndex}
                style={[styles.dot, { backgroundColor: statusColors[status] }]}
              />
            ))}
          </View>
        ))}
      </View>
    </ShareCardShell>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: spacing.xs + 2,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.xs + 2,
  },
  dot: {
    height: 36,
    width: 36,
    borderRadius: borderRadius.sm,
  },
});
