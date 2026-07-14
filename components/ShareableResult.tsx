import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { GuessResult, AttributeStatus } from '@/types/game';
import { type, spacing, borderRadius } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';
import { useDailyStateStore } from '@/hooks/useDailyStateStore';
import { whoAreYaStatusRows } from '@/lib/shareText';

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
  const { colors, gradients } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const statusColors: Record<AttributeStatus, string> = useMemo(
    () => ({
      CORRECT: colors.accent,
      HIGHER: colors.streak,
      LOWER: colors.streak,
      WRONG: colors.textMuted,
    }),
    [colors],
  );
  const currentStreak = useDailyStateStore((s) => s.currentStreak);
  const statusRows = useMemo(() => whoAreYaStatusRows(guesses), [guesses]);

  return (
    <LinearGradient colors={gradients.cardBg} style={styles.container}>
      <View style={styles.header}>
        <FontAwesome name="futbol-o" size={18} color={colors.accent} />
        <Text style={styles.branding}>FOOTBALL DAILY</Text>
      </View>
      <Text style={styles.title}>My Name Is… #{dailyNumber}</Text>
      <Text style={styles.score}>
        {won ? `${guesses.length}/${maxGuesses}` : `X/${maxGuesses}`}
      </Text>
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
    dot: {
      height: 36,
      width: 36,
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
