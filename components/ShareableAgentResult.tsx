import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { type, spacing } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';
import ShareCardShell from '@/components/ShareCardShell';

interface RoundResult {
  correct: boolean;
}

interface ShareableAgentResultProps {
  score: number;
  totalRounds: number;
  results: RoundResult[];
}

export default function ShareableAgentResult({
  score,
  totalRounds,
  results,
}: ShareableAgentResultProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <ShareCardShell
      title="Transfer Agent"
      verdict={`${score}/${totalRounds} DEALS`}
      won={score > 0}>
      <Text style={styles.value}>
        {score}/{totalRounds}
      </Text>
      <View style={styles.marks}>
        {results.map((r, i) => (
          <Text key={i} style={[styles.mark, { color: r.correct ? colors.accent : colors.danger }]}>
            {r.correct ? '✓' : '✗'}
          </Text>
        ))}
      </View>
    </ShareCardShell>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    value: {
      ...type.scoreLarge,
      color: c.accentBright,
      marginBottom: spacing.md,
    },
    marks: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    mark: {
      ...type.h2,
    },
  });
