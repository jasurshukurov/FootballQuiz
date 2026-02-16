import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ShareableHigherLowerResultProps {
  streak: number;
}

export default function ShareableHigherLowerResult({ streak }: ShareableHigherLowerResultProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Higher / Lower</Text>
      <Text style={styles.streakLabel}>STREAK</Text>
      <Text style={styles.streakValue}>{streak}</Text>
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
    marginBottom: 16,
    fontSize: 18,
    fontFamily: 'BarlowCondensed-Bold',
    color: '#F5F5F0',
  },
  streakLabel: {
    fontSize: 12,
    fontFamily: 'BarlowCondensed-SemiBold',
    color: 'rgba(245,245,240,0.6)',
    letterSpacing: 3,
  },
  streakValue: {
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
