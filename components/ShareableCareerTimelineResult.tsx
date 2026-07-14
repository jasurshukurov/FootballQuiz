import React from 'react';
import { Text, StyleSheet } from 'react-native';

import { type } from '@/constants/theme';
import ShareCardShell from '@/components/ShareCardShell';

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
  const totalLives = 3;
  const hearts = '❤️'.repeat(livesRemaining) + '🖤'.repeat(totalLives - livesRemaining);

  return (
    <ShareCardShell
      title="Career Timeline"
      verdict={`${guessedCount}/${totalHidden} CLUBS`}
      won={livesRemaining > 0}>
      <Text style={styles.hearts}>{hearts}</Text>
    </ShareCardShell>
  );
}

const styles = StyleSheet.create({
  hearts: {
    ...type.h2,
  },
});
