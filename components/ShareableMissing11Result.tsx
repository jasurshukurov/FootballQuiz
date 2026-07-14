import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { type, spacing, borderRadius } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';
import { useDailyStateStore } from '@/hooks/useDailyStateStore';

interface ShareableMissing11ResultProps {
  teamName: string;
  found: number;
  revealedSlots: Set<number>;
}

export default function ShareableMissing11Result({
  teamName,
  found,
  revealedSlots,
}: ShareableMissing11ResultProps) {
  const { colors, gradients } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const currentStreak = useDailyStateStore((s) => s.currentStreak);

  return (
    <LinearGradient colors={gradients.cardBg} style={styles.container}>
      <View style={styles.header}>
        <FontAwesome name="users" size={18} color={colors.accent} />
        <Text style={styles.branding}>FOOTBALL DAILY</Text>
      </View>
      <Text style={styles.title}>Missing XI</Text>
      <Text style={styles.subtitle}>{teamName}</Text>
      <Text style={styles.scoreValue}>{found}/11</Text>
      <View style={styles.circles}>
        {Array.from({ length: 11 }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.circle,
              { backgroundColor: revealedSlots.has(i) ? colors.accent : colors.textMuted },
            ]}
          />
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
    subtitle: {
      ...type.captionBold,
      color: c.textSecondary,
      marginBottom: spacing.md,
    },
    scoreValue: {
      ...type.scoreLarge,
      color: c.accentBright,
      marginBottom: spacing.lg,
    },
    circles: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: spacing.sm,
      maxWidth: 260,
    },
    circle: {
      width: 32,
      height: 32,
      borderRadius: borderRadius.full,
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
