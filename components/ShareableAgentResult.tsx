import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

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
  return (
    <View style={styles.container}>
      <Text style={styles.title}>The Agent</Text>
      <Text style={styles.score}>
        {score}/{totalRounds}
      </Text>
      <View style={styles.marks}>
        {results.map((r, i) => (
          <Text key={i} style={[styles.mark, { color: r.correct ? '#52B788' : '#E63946' }]}>
            {r.correct ? '\u2713' : '\u2717'}
          </Text>
        ))}
      </View>
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
  score: {
    fontSize: 48,
    fontFamily: 'BarlowCondensed-Bold',
    color: '#05F26C',
    marginBottom: 8,
  },
  marks: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  mark: {
    fontSize: 20,
    fontFamily: 'BarlowCondensed-Bold',
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
