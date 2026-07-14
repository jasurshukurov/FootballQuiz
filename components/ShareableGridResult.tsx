import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { type, spacing, borderRadius } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';
import { useDailyStateStore } from '@/hooks/useDailyStateStore';

type CellState = 'empty' | 'selected' | 'correct' | 'wrong';

interface ShareableGridResultProps {
  cellStates: CellState[][];
  score: number;
}

export default function ShareableGridResult({ cellStates, score }: ShareableGridResultProps) {
  const { colors, gradients } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const stateColors: Record<CellState, string> = useMemo(
    () => ({
      correct: colors.accent,
      wrong: colors.danger,
      empty: colors.textMuted,
      selected: colors.textMuted,
    }),
    [colors],
  );
  const today = new Date().toISOString().split('T')[0];
  const currentStreak = useDailyStateStore((s) => s.currentStreak);

  return (
    <LinearGradient colors={gradients.cardBg} style={styles.container}>
      <View style={styles.header}>
        <FontAwesome name="th" size={18} color={colors.accent} />
        <Text style={styles.branding}>FOOTBALL DAILY</Text>
      </View>
      <Text style={styles.title}>The Grid · {today}</Text>
      <Text style={styles.score}>{score}/9</Text>
      <View style={styles.grid}>
        {cellStates.map((row, rowIdx) => (
          <View key={rowIdx} style={styles.row}>
            {row.map((state, colIdx) => (
              <View key={colIdx} style={[styles.cell, { backgroundColor: stateColors[state] }]} />
            ))}
          </View>
        ))}
      </View>
      {currentStreak > 0 && <Text style={styles.streak}>🔥 {currentStreak} day streak</Text>}
      <Text style={styles.cta}>Play at footballquiz.app</Text>
    </LinearGradient>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: c.border,
      // Solid canvas under the translucent cardBg gradient — react-native-view-shot
      // captures must never end up with a transparent background.
      backgroundColor: c.bgBase,
      paddingVertical: spacing.xxl,
      paddingHorizontal: spacing.xl,
      minWidth: 320,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },
    branding: {
      ...type.h3,
      color: c.accent,
      letterSpacing: 2,
    },
    title: {
      ...type.h3,
      color: c.textPrimary,
      marginBottom: spacing.xs,
    },
    score: {
      ...type.scoreLarge,
      color: c.accentBright,
      marginBottom: spacing.lg,
    },
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
    streak: {
      ...type.captionBold,
      color: c.streak,
      marginTop: spacing.lg,
    },
    cta: {
      ...type.caption,
      color: c.textMuted,
      marginTop: spacing.md,
      textAlign: 'center',
    },
  });
