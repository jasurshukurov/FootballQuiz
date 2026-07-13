import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, fonts, gradients } from '@/constants/theme';
import { useDailyStateStore } from '@/hooks/useDailyStateStore';

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
  const currentStreak = useDailyStateStore((s) => s.currentStreak);

  return (
    <LinearGradient colors={gradients.screenBg} style={styles.container}>
      <Text style={styles.branding}>FOOTBALL QUIZ</Text>
      <Text style={styles.title}>Career Timeline</Text>
      <Text style={styles.playerName}>{playerName}</Text>
      <Text style={styles.scoreLabel}>CLUBS GUESSED</Text>
      <Text style={styles.scoreValue}>
        {guessedCount}/{totalHidden}
      </Text>
      <Text style={styles.hearts}>{hearts}</Text>
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
    marginBottom: 8,
    fontSize: 18,
    fontFamily: fonts.heading,
    color: colors.chalkWhite,
  },
  playerName: {
    marginBottom: 16,
    fontSize: 22,
    fontFamily: fonts.heading,
    color: colors.pitchGreen,
  },
  scoreLabel: {
    fontSize: 12,
    fontFamily: fonts.subheading,
    color: 'rgba(245,245,240,0.6)',
    letterSpacing: 3,
  },
  scoreValue: {
    fontSize: 48,
    fontFamily: fonts.heading,
    color: colors.pitchGreen,
    marginBottom: 8,
  },
  hearts: {
    fontSize: 24,
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
