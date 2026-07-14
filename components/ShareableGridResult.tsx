import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';

import { spacing, borderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import ShareCardShell from '@/components/ShareCardShell';

type CellState = 'empty' | 'selected' | 'correct' | 'wrong';

interface ShareableGridResultProps {
  cellStates: CellState[][];
  score: number;
}

export default function ShareableGridResult({ cellStates, score }: ShareableGridResultProps) {
  const { colors } = useTheme();
  const stateColors: Record<CellState, string> = useMemo(
    () => ({
      correct: colors.accent,
      wrong: colors.danger,
      empty: colors.textMuted,
      selected: colors.textMuted,
    }),
    [colors],
  );

  return (
    <ShareCardShell title="Immaculate Grid" verdict={`${score}/9`} won={score > 0}>
      <View style={styles.grid}>
        {cellStates.map((row, rowIdx) => (
          <View key={rowIdx} style={styles.row}>
            {row.map((state, colIdx) => (
              <View key={colIdx} style={[styles.cell, { backgroundColor: stateColors[state] }]} />
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
  cell: {
    height: 44,
    width: 44,
    borderRadius: borderRadius.sm,
  },
});
