import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type CellState = 'empty' | 'selected' | 'correct' | 'wrong';

interface ShareableGridResultProps {
  cellStates: CellState[][];
  score: number;
}

const STATE_COLORS: Record<CellState, string> = {
  correct: '#52B788',
  wrong: '#E63946',
  empty: '#6C757D',
  selected: '#6C757D',
};

export default function ShareableGridResult({ cellStates, score }: ShareableGridResultProps) {
  const today = new Date().toISOString().split('T')[0];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Football Grid #{today}</Text>
      <Text style={styles.score}>{score}/9</Text>
      <View style={styles.grid}>
        {cellStates.map((row, rowIdx) => (
          <View key={rowIdx} style={styles.row}>
            {row.map((state, colIdx) => (
              <View key={colIdx} style={[styles.cell, { backgroundColor: STATE_COLORS[state] }]} />
            ))}
          </View>
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
  },
  title: {
    marginBottom: 4,
    fontSize: 18,
    fontFamily: 'BarlowCondensed-Bold',
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
  cell: {
    height: 40,
    width: 40,
    borderRadius: 4,
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
