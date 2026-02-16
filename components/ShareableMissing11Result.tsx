import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ShareableMissing11ResultProps {
  teamName: string;
  found: number;
  revealedSlots: Set<number>;
}

export default function ShareableMissing11Result({
  teamName,
  found,
  revealedSlots,
}: ShareableMissing11ResultProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Missing 11</Text>
      <Text style={styles.subtitle}>{teamName}</Text>
      <Text style={styles.score}>{found}/11 players found</Text>
      <View style={styles.circles}>
        {Array.from({ length: 11 }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.circle,
              { backgroundColor: revealedSlots.has(i) ? '#52B788' : '#6C757D' },
            ]}
          />
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
    marginBottom: 2,
    fontSize: 18,
    fontFamily: 'BarlowCondensed-Bold',
    color: '#F5F5F0',
  },
  subtitle: {
    marginBottom: 4,
    fontSize: 14,
    fontFamily: 'BarlowCondensed-SemiBold',
    color: 'rgba(245,245,240,0.8)',
  },
  score: {
    marginBottom: 16,
    fontSize: 14,
    color: 'rgba(245,245,240,0.8)',
  },
  circles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
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
