import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { type, spacing, borderRadius } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';
import { useDailyStateStore } from '@/hooks/useDailyStateStore';

interface ShareableCareerTimelineResultProps {
  playerName: string;
  guessedCount: number;
  totalHidden: number;
  livesRemaining: number;
}

export default function ShareableCareerTimelineResult({
  guessedCount,
  totalHidden,
  livesRemaining,
}: ShareableCareerTimelineResultProps) {
  const { colors, gradients } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const totalLives = 3;
  const hearts = '❤️'.repeat(livesRemaining) + '🖤'.repeat(totalLives - livesRemaining);
  const currentStreak = useDailyStateStore((s) => s.currentStreak);

  return (
    <LinearGradient colors={gradients.cardBg} style={styles.container}>
      <View style={styles.header}>
        <FontAwesome name="history" size={18} color={colors.accent} />
        <Text style={styles.branding}>FOOTBALL DAILY</Text>
      </View>
      <Text style={styles.title}>Career Timeline</Text>
      <Text style={styles.scoreLabel}>CLUBS GUESSED</Text>
      <Text style={styles.scoreValue}>
        {guessedCount}/{totalHidden}
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
    scoreLabel: {
      ...type.micro,
      color: c.textMuted,
      letterSpacing: 3,
    },
    scoreValue: {
      ...type.scoreLarge,
      color: c.accentBright,
      marginBottom: spacing.sm,
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
