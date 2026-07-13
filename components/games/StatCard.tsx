import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Player } from '@/types/player';
import { colors, fonts, spacing } from '@/constants/theme';
import GlassCard from '@/components/ui/GlassCard';
import TeamCrest from '@/components/ui/TeamCrest';
import PopInView from '@/components/ui/PopInView';

interface StatCardProps {
  player: Player;
  showValue: boolean;
  stat: string;
  formattedValue: string;
  difficulty?: string; // "Easy" | "Medium" | "Hard" | "Expert"
}

const difficultyColors: Record<string, { bg: string; text: string }> = {
  Easy: { bg: 'rgba(5,242,108,0.15)', text: '#05F26C' },
  Medium: { bg: 'rgba(244,162,97,0.15)', text: '#F4A261' },
  Hard: { bg: 'rgba(255,107,53,0.15)', text: '#FF6B35' },
  Expert: { bg: 'rgba(230,57,70,0.15)', text: '#E63946' },
};

export default function StatCard({
  player,
  showValue,
  stat,
  formattedValue,
  difficulty,
}: StatCardProps) {
  const diffColor = difficulty ? difficultyColors[difficulty] : undefined;

  return (
    <GlassCard style={styles.card}>
      <Text style={styles.playerName} adjustsFontSizeToFit minimumFontScale={0.7} numberOfLines={2}>
        {player.name}
      </Text>
      <View style={styles.teamRow}>
        <TeamCrest teamName={player.current_team} size={20} />
        <Text style={styles.teamName} numberOfLines={2}>
          {player.current_team}
        </Text>
      </View>
      {difficulty && diffColor && (
        <View style={[styles.difficultyPill, { backgroundColor: diffColor.bg }]}>
          <Text style={[styles.difficultyText, { color: diffColor.text }]}>{difficulty}</Text>
        </View>
      )}
      <Text style={styles.statLabel}>{stat}</Text>
      {showValue ? (
        <PopInView>
          <Text style={styles.statValue}>{formattedValue}</Text>
        </PopInView>
      ) : (
        <Text style={styles.statHidden}>?</Text>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 180,
  },
  playerName: {
    fontFamily: fonts.heading,
    fontSize: 24,
    color: colors.chalkWhite,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  teamName: {
    fontFamily: fonts.subheading,
    fontSize: 16,
    color: colors.steelGray,
  },
  difficultyPill: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 10,
    marginBottom: spacing.sm,
    alignSelf: 'center',
  },
  difficultyText: {
    fontFamily: fonts.subheading,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statLabel: {
    fontFamily: fonts.subheading,
    fontSize: 14,
    color: colors.steelGray,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  statValue: {
    fontFamily: fonts.heading,
    fontSize: 32,
    color: colors.pitchGreen,
    textAlign: 'center',
  },
  statHidden: {
    fontFamily: fonts.heading,
    fontSize: 40,
    color: colors.chalkWhite,
    textAlign: 'center',
  },
});
