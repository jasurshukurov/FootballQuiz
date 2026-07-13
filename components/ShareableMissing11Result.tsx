import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, fonts, gradients } from '@/constants/theme';
import { useDailyStateStore } from '@/hooks/useDailyStateStore';

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
  const currentStreak = useDailyStateStore((s) => s.currentStreak);

  return (
    <LinearGradient colors={gradients.screenBg} style={styles.container}>
      <Text style={styles.branding}>FOOTBALL QUIZ</Text>
      <Text style={styles.title}>Missing 11</Text>
      <Text style={styles.subtitle}>{teamName}</Text>
      <Text style={styles.scoreValue}>{found}/11</Text>
      <View style={styles.circles}>
        {Array.from({ length: 11 }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.circle,
              { backgroundColor: revealedSlots.has(i) ? colors.matchGreen : colors.steelGray },
            ]}
          />
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
    marginBottom: 2,
    fontSize: 18,
    fontFamily: fonts.heading,
    color: colors.chalkWhite,
  },
  subtitle: {
    marginBottom: 12,
    fontSize: 14,
    fontFamily: fonts.subheading,
    color: 'rgba(245,245,240,0.8)',
  },
  scoreValue: {
    fontSize: 48,
    fontFamily: fonts.heading,
    color: colors.pitchGreen,
    marginBottom: 16,
  },
  circles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    maxWidth: 260,
  },
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
