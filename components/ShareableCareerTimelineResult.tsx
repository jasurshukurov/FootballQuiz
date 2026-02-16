import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ShareableCareerTimelineResultProps {
  playerName: string;
  guessedCount: number;
  totalHidden: number;
  livesRemaining: number;
}

export default function ShareableCareerTimelineResult({
  playerName,
  guessedCount,
  totalHidden,
  livesRemaining,
}: ShareableCareerTimelineResultProps) {
  const totalLives = 3;
  const hearts =
    '\u2764\uFE0F'.repeat(livesRemaining) + '\uD83D\uDDA4'.repeat(totalLives - livesRemaining);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Career Timeline</Text>
      <Text style={styles.playerName}>{playerName}</Text>
      <Text style={styles.scoreLabel}>CLUBS GUESSED</Text>
      <Text style={styles.scoreValue}>
        {guessedCount}/{totalHidden}
      </Text>
      <Text style={styles.hearts}>{hearts}</Text>
      <Text style={styles.tagline}>Can you beat my score? #FootballQuiz2025</Text>
      <Text style={styles.footer}>footballquiz.app</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: '#1A1A2E',
    padding: 24,
    minWidth: 240,
  },
  title: {
    marginBottom: 8,
    fontSize: 18,
    fontFamily: 'BarlowCondensed-Bold',
    color: '#F5F5F0',
  },
  playerName: {
    marginBottom: 16,
    fontSize: 22,
    fontFamily: 'BarlowCondensed-Bold',
    color: '#05F26C',
  },
  scoreLabel: {
    fontSize: 12,
    fontFamily: 'BarlowCondensed-SemiBold',
    color: 'rgba(245,245,240,0.6)',
    letterSpacing: 3,
  },
  scoreValue: {
    fontSize: 48,
    fontFamily: 'BarlowCondensed-Bold',
    color: '#05F26C',
    marginBottom: 8,
  },
  hearts: {
    fontSize: 24,
    marginBottom: 8,
  },
  tagline: {
    marginTop: 16,
    fontSize: 12,
    fontFamily: 'BarlowCondensed-SemiBold',
    color: 'rgba(245,245,240,0.6)',
  },
  footer: {
    marginTop: 8,
    fontSize: 12,
    color: '#6C757D',
  },
});
