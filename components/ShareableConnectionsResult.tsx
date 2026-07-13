import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { ConnectionsCategory } from '@/lib/connectionsGenerator';
import { colors, fonts, gradients } from '@/constants/theme';
import { useDailyStateStore } from '@/hooks/useDailyStateStore';

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
  const currentStreak = useDailyStateStore((s) => s.currentStreak);

  // Show the category bars in the order the player solved them (like the NYT
  // Connections share grid), with any unsolved categories appended after.
  const orderedCategories = [
    ...solvedOrder
      .map((name) => categories.find((c) => c.name === name))
      .filter((c): c is ConnectionsCategory => c !== undefined),
    ...categories.filter((c) => !solvedOrder.includes(c.name)),
  ];

  return (
    <LinearGradient colors={gradients.screenBg} style={styles.container}>
      <Text style={styles.branding}>FOOTBALL QUIZ</Text>
      <Text style={styles.title}>Connections #{today}</Text>
      <Text style={styles.score}>
        {mistakes === 0 ? 'Flawless!' : `${mistakes} mistake${mistakes !== 1 ? 's' : ''}`}
      </Text>
      <View style={styles.grid}>
        {orderedCategories.map((cat) => (
          <View key={cat.name} style={[styles.bar, { backgroundColor: cat.color }]} />
        ))}
      </View>
      {currentStreak > 0 && <Text style={styles.streak}>{currentStreak} day streak</Text>}
      <Text style={styles.cta}>Can you beat my score? Play at footballquiz.app</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 32,
    paddingHorizontal: 24,
    minWidth: 320,
  },
  branding: {
    fontSize: 28,
    fontFamily: fonts.heading,
    color: colors.pitchGreen,
    marginBottom: 16,
    letterSpacing: 2,
  },
  title: {
    marginBottom: 4,
    fontSize: 18,
    fontFamily: fonts.heading,
    color: colors.chalkWhite,
  },
  score: {
    marginBottom: 16,
    fontSize: 14,
    fontFamily: fonts.body,
    color: 'rgba(245,245,240,0.8)',
  },
  grid: {
    gap: 8,
    width: '100%',
    alignItems: 'center',
  },
  bar: {
    height: 28,
    width: 200,
    borderRadius: 6,
  },
  streak: {
    marginTop: 16,
    fontSize: 14,
    fontFamily: fonts.subheading,
    color: colors.pitchGreen,
  },
  cta: {
    marginTop: 16,
    fontSize: 11,
    fontFamily: fonts.body,
    color: colors.steelGray,
    textAlign: 'center',
  },
});
