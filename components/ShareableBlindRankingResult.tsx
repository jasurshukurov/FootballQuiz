import React, { useMemo } from 'react';
import { Text, StyleSheet } from 'react-native';

import { type, spacing } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';
import ShareCardShell from '@/components/ShareCardShell';

interface ShareableBlindRankingResultProps {
  score: number;
  categoryTitle: string;
}

export default function ShareableBlindRankingResult({
  score,
  categoryTitle,
}: ShareableBlindRankingResultProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <ShareCardShell title="Blind Ranking" verdict={`${score}/5`} won={score > 0}>
      <Text style={styles.category}>{categoryTitle}</Text>
      <Text style={styles.label}>SCORE</Text>
      <Text style={styles.value}>{score}/5</Text>
    </ShareCardShell>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    category: {
      ...type.captionBold,
      color: c.accent,
      marginBottom: spacing.lg,
    },
    label: {
      ...type.micro,
      color: c.textMuted,
      letterSpacing: 3,
    },
    value: {
      ...type.scoreLarge,
      color: c.accentBright,
      marginTop: spacing.sm,
    },
  });
