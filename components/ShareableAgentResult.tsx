import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, fonts, gradients } from '@/constants/theme';
import { useDailyStateStore } from '@/hooks/useDailyStateStore';

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
  const currentStreak = useDailyStateStore((s) => s.currentStreak);

  return (
    <LinearGradient colors={gradients.screenBg} style={styles.container}>
      <Text style={styles.branding}>FOOTBALL QUIZ</Text>
      <Text style={styles.title}>The Agent</Text>
      <Text style={styles.scoreValue}>
        {score}/{totalRounds}
      </Text>
      <View style={styles.marks}>
        {results.map((r, i) => (
          <Text
            key={i}
            style={[styles.mark, { color: r.correct ? colors.matchGreen : colors.cardRed }]}>
            {r.correct ? '\u2713' : '\u2717'}
          </Text>
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
  scoreValue: {
    fontSize: 56,
    fontFamily: fonts.heading,
    color: colors.pitchGreen,
    marginBottom: 8,
  },
  marks: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  mark: {
    fontSize: 24,
    fontFamily: fonts.heading,
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
