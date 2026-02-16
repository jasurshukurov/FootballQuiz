import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { GuessResult, AttributeStatus } from '@/types/game';

interface ShareableResultProps {
  dailyNumber: number;
  guesses: GuessResult[];
  maxGuesses: number;
  won: boolean;
}

const STATUS_COLORS: Record<AttributeStatus, string> = {
  CORRECT: '#52B788',
  HIGHER: '#F4A261',
  LOWER: '#F4A261',
  WRONG: '#6C757D',
};

export default function ShareableResult({
  dailyNumber,
  guesses,
  maxGuesses,
  won,
}: ShareableResultProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Football Quiz #{dailyNumber}</Text>
      <Text style={styles.score}>
        {won ? `${guesses.length}/${maxGuesses}` : `X/${maxGuesses}`}
      </Text>
      <View style={styles.grid}>
        {guesses.map((guess, rowIndex) => {
          const statuses = [
            guess.comparisons.team.status,
            guess.comparisons.league.status,
            guess.comparisons.nationality.status,
            guess.comparisons.position.status,
            guess.comparisons.marketValue.status,
          ];
          return (
            <View key={rowIndex} style={styles.row}>
              {statuses.map((status, colIndex) => (
                <View
                  key={colIndex}
                  style={[styles.dot, { backgroundColor: STATUS_COLORS[status] }]}
                />
              ))}
            </View>
          );
        })}
      </View>
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
  },
  title: {
    marginBottom: 4,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F5F5F0',
  },
  score: {
    marginBottom: 16,
    fontSize: 14,
    color: 'rgba(245,245,240,0.8)',
  },
  grid: {
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    height: 32,
    width: 32,
    borderRadius: 4,
  },
  footer: {
    marginTop: 16,
    fontSize: 12,
    color: '#6C757D',
  },
});
