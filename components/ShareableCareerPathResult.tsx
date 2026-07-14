import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { type, spacing, borderRadius } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';
import { useDailyStateStore } from '@/hooks/useDailyStateStore';

interface ShareableCareerPathResultProps {
  playerName: string;
  isWin: boolean;
  attemptsUsed: number;
  totalAttempts: number;
}

export default function ShareableCareerPathResult({
  isWin,
  attemptsUsed,
  totalAttempts,
}: ShareableCareerPathResultProps) {
  const { colors, gradients } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const remaining = Math.max(0, totalAttempts - attemptsUsed);
  const hearts = '❤️'.repeat(remaining) + '🖤'.repeat(totalAttempts - remaining);
  const currentStreak = useDailyStateStore((s) => s.currentStreak);

  return (
    <LinearGradient colors={gradients.cardBg} style={styles.container}>
      <View style={styles.header}>
        <FontAwesome name="road" size={18} color={colors.accent} />
        <Text style={styles.branding}>FOOTBALL DAILY</Text>
      </View>
      <Text style={styles.title}>Career Path</Text>
      <Text style={[styles.result, { color: isWin ? colors.accent : colors.danger }]}>
        {isWin ? 'SOLVED!' : 'MISSED IT'}
      </Text>
      <Text style={styles.hearts}>{hearts}</Text>
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
      marginBottom: spacing.sm,
    },
    result: {
      ...type.h1,
      marginBottom: spacing.md,
    },
    hearts: {
      ...type.h2,
      marginBottom: spacing.sm,
    },
    streak: {
      ...type.captionBold,
      color: c.streak,
      marginTop: spacing.sm,
    },
    cta: {
      ...type.caption,
      color: c.textMuted,
      marginTop: spacing.md,
      textAlign: 'center',
    },
  });
