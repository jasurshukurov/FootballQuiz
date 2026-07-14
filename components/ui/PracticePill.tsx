import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { borderRadius, spacing, type } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';

/** Small pill shown on a game screen when it's being played in practice/archive
 *  mode (a past day), so the user knows it doesn't affect their streak. */
export default function PracticePill({ date }: { date: string }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.pill}>
      <Text style={styles.text}>{`PRACTICE · ${date}`}</Text>
    </View>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    pill: {
      alignSelf: 'center',
      borderRadius: borderRadius.full,
      borderWidth: 1,
      borderColor: c.streak,
      backgroundColor: c.streakSoft,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      marginBottom: spacing.sm,
    },
    text: {
      ...type.micro,
      color: c.streakBright,
      letterSpacing: 1.5,
    },
  });
