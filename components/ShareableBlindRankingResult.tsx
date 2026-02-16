import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ShareableBlindRankingResultProps {
  score: number;
  categoryTitle: string;
}

export default function ShareableBlindRankingResult({
  score,
  categoryTitle,
}: ShareableBlindRankingResultProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Blind Ranking</Text>
      <Text style={styles.category}>{categoryTitle}</Text>
      <Text style={styles.scoreLabel}>SCORE</Text>
      <Text style={styles.scoreValue}>{score}/5</Text>
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
    marginBottom: 4,
    fontSize: 18,
    fontFamily: 'BarlowCondensed-Bold',
    color: '#F5F5F0',
  },
  category: {
    marginBottom: 16,
    fontSize: 14,
    fontFamily: 'BarlowCondensed-SemiBold',
    color: 'rgba(5,242,108,0.8)',
  },
  scoreLabel: {
    fontSize: 12,
    fontFamily: 'BarlowCondensed-SemiBold',
    color: 'rgba(245,245,240,0.6)',
    letterSpacing: 3,
  },
  scoreValue: {
    fontSize: 64,
    fontFamily: 'BarlowCondensed-Bold',
    color: '#05F26C',
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
