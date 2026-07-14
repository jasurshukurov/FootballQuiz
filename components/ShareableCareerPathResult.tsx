import React from 'react';
import { Text, StyleSheet } from 'react-native';

import { type } from '@/constants/theme';
import ShareCardShell from '@/components/ShareCardShell';

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
  const remaining = Math.max(0, totalAttempts - attemptsUsed);
  const hearts = '❤️'.repeat(remaining) + '🖤'.repeat(totalAttempts - remaining);

  return (
    <ShareCardShell
      title="Career Path"
      verdict={isWin ? `GOT IT IN ${attemptsUsed}/${totalAttempts}` : `X/${totalAttempts}`}
      won={isWin}>
      <Text style={styles.hearts}>{hearts}</Text>
    </ShareCardShell>
  );
}

const styles = StyleSheet.create({
  hearts: {
    ...type.h2,
  },
});
