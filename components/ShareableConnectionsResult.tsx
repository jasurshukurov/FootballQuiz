import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { ConnectionsCategory } from '@/lib/connectionsGenerator';

interface ShareableConnectionsResultProps {
  categories: ConnectionsCategory[];
  solvedOrder: string[];
  mistakes: number;
}

export default function ShareableConnectionsResult({
  categories,
  solvedOrder,
  mistakes,
}: ShareableConnectionsResultProps) {
  const today = new Date().toISOString().split('T')[0];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Connections #{today}</Text>
      <Text style={styles.score}>
        {mistakes === 0 ? 'Flawless!' : `${mistakes} mistake${mistakes !== 1 ? 's' : ''}`}
      </Text>
      <View style={styles.grid}>
        {categories.map((cat) => (
          <View key={cat.name} style={styles.row}>
            {cat.playerNames.map((_, i) => (
              <View key={i} style={[styles.cell, { backgroundColor: cat.color }]} />
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
    height: 32,
    width: 32,
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
