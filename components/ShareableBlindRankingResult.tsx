import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, fonts, gradients } from '@/constants/theme';
import { useDailyStateStore } from '@/hooks/useDailyStateStore';

interface ShareableBlindRankingResultProps {
  score: number;
  categoryTitle: string;
}

export default function ShareableBlindRankingResult({
  score,
  categoryTitle,
}: ShareableBlindRankingResultProps) {
  const currentStreak = useDailyStateStore((s) => s.currentStreak);

  return (
    <LinearGradient colors={gradients.screenBg} style={styles.container}>
      <Text style={styles.branding}>FOOTBALL QUIZ</Text>
      <Text style={styles.title}>Blind Ranking</Text>
      <Text style={styles.category}>{categoryTitle}</Text>
      <Text style={styles.scoreLabel}>SCORE</Text>
      <Text style={styles.scoreValue}>{score}/5</Text>
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
  category: {
    marginBottom: 16,
    fontSize: 14,
    fontFamily: fonts.subheading,
    color: 'rgba(5,242,108,0.8)',
  },
  scoreLabel: {
    fontSize: 12,
    fontFamily: fonts.subheading,
    color: 'rgba(245,245,240,0.6)',
    letterSpacing: 3,
  },
  scoreValue: {
    fontSize: 64,
    fontFamily: fonts.heading,
    color: colors.pitchGreen,
    marginBottom: 8,
  },
  streak: {
    marginTop: 8,
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
