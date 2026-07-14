import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { type, spacing, borderRadius } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';
import { useDailyStateStore } from '@/hooks/useDailyStateStore';

interface ShareableHigherLowerResultProps {
  streak: number;
}

export default function ShareableHigherLowerResult({ streak }: ShareableHigherLowerResultProps) {
  const { colors, gradients } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const currentStreak = useDailyStateStore((s) => s.currentStreak);

  return (
    <LinearGradient colors={gradients.cardBg} style={styles.container}>
      <View style={styles.header}>
        <FontAwesome name="arrows-v" size={18} color={colors.accent} />
        <Text style={styles.branding}>FOOTBALL DAILY</Text>
      </View>
      <Text style={styles.title}>Higher / Lower</Text>
      <Text style={styles.streakLabel}>BEST STREAK</Text>
      <Text style={styles.streakValue}>{streak}</Text>
      {currentStreak > 0 && <Text style={styles.dailyStreak}>🔥 {currentStreak} day streak</Text>}
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
      marginBottom: spacing.lg,
    },
    streakLabel: {
      ...type.micro,
      color: c.textMuted,
      letterSpacing: 3,
    },
    streakValue: {
      ...type.scoreLarge,
      color: c.accentBright,
      marginBottom: spacing.sm,
    },
    dailyStreak: {
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
