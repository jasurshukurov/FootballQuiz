import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { type, spacing, borderRadius } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';
import { useDailyStateStore } from '@/hooks/useDailyStateStore';

interface ShareableTopListsResultProps {
  title: string;
  found: number;
  total: number;
  livesUsed: number;
  slots: boolean[];
}

export default function ShareableTopListsResult({
  title,
  found,
  total,
  livesUsed,
  slots,
}: ShareableTopListsResultProps) {
  const { colors, gradients } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const currentStreak = useDailyStateStore((s) => s.currentStreak);
  const row = slots.map((f) => (f ? '🟩' : '⬜')).join('');

  return (
    <LinearGradient colors={gradients.cardBg} style={styles.container}>
      <View style={styles.header}>
        <FontAwesome name="list-ol" size={18} color={colors.accent} />
        <Text style={styles.branding}>FOOTBALL DAILY</Text>
      </View>
      <Text style={styles.mode}>Top Lists</Text>
      <Text style={styles.listTitle}>{title}</Text>
      <Text style={styles.score}>
        {found}/{total} found
      </Text>
      <Text style={styles.row}>{row}</Text>
      <Text style={styles.lives}>
        {livesUsed} {livesUsed === 1 ? 'life' : 'lives'} used
      </Text>
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
      marginBottom: spacing.md,
    },
    branding: {
      ...type.h3,
      color: c.accent,
      letterSpacing: 2,
    },
    mode: {
      ...type.h3,
      color: c.textPrimary,
      marginBottom: spacing.xs,
    },
    listTitle: {
      ...type.captionBold,
      color: c.textSecondary,
      textAlign: 'center',
      marginBottom: spacing.md,
    },
    score: {
      ...type.scoreLarge,
      color: c.accentBright,
      marginBottom: spacing.sm,
    },
    row: {
      ...type.h2,
      marginBottom: spacing.sm,
    },
    lives: {
      ...type.caption,
      color: c.textMuted,
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
