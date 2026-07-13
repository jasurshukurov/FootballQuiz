import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, fonts, gradients } from '@/constants/theme';
import { useDailyStateStore } from '@/hooks/useDailyStateStore';

interface ShareableTopListsResultProps {
  title: string;
  found: number;
  total: number;
  livesUsed: number;
  slots: boolean[];
}

export default function ShareableTopListsResult({
  title,
  found,
  total,
  livesUsed,
  slots,
}: ShareableTopListsResultProps) {
  const currentStreak = useDailyStateStore((s) => s.currentStreak);
  const row = slots.map((f) => (f ? '🟩' : '⬜')).join('');

  return (
    <LinearGradient colors={gradients.screenBg} style={styles.container}>
      <Text style={styles.branding}>FOOTBALL QUIZ</Text>
      <Text style={styles.mode}>Top Lists</Text>
      <Text style={styles.listTitle}>{title}</Text>
      <Text style={styles.score}>
        {found}/{total} found
      </Text>
      <Text style={styles.row}>{row}</Text>
      <Text style={styles.lives}>
        {livesUsed} {livesUsed === 1 ? 'life' : 'lives'} used
      </Text>
      {currentStreak > 0 && <Text style={styles.streak}>{currentStreak} day streak</Text>}
      <Text style={styles.cta}>Can you name them all? Play at footballquiz.app</Text>
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
    marginBottom: 12,
    letterSpacing: 2,
  },
  mode: {
    fontSize: 18,
    fontFamily: fonts.heading,
    color: colors.chalkWhite,
    marginBottom: 4,
  },
  listTitle: {
    fontSize: 14,
    fontFamily: fonts.subheading,
    color: 'rgba(245,245,240,0.8)',
    textAlign: 'center',
    marginBottom: 12,
  },
  score: {
    fontSize: 40,
    fontFamily: fonts.heading,
    color: colors.pitchGreen,
    marginBottom: 8,
  },
  row: {
    fontSize: 22,
    marginBottom: 8,
  },
  lives: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.steelGray,
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
