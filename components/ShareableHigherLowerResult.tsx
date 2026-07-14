import React, { useMemo } from 'react';
import { Text, StyleSheet } from 'react-native';

import { type, spacing } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';
import ShareCardShell from '@/components/ShareCardShell';

interface ShareableHigherLowerResultProps {
  streak: number;
}

export default function ShareableHigherLowerResult({ streak }: ShareableHigherLowerResultProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <ShareCardShell title="Higher / Lower" verdict={`STREAK ${streak}`} won={streak > 0}>
      <Text style={styles.label}>BEST STREAK</Text>
      <Text style={styles.value}>{streak}</Text>
    </ShareCardShell>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
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
