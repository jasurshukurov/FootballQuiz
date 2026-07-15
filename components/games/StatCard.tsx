import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Player } from '@/types/player';
import { type, spacing, borderRadius } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';
import GlassCard from '@/components/ui/GlassCard';
import TeamCrest from '@/components/ui/TeamCrest';
import PopInView from '@/components/ui/PopInView';
// Portrait is safe here: the hidden stat is market value, not identity. No inline
// credit line — attribution lives in lib/playerPhotos.ts and the Photo Credits screen.
import PlayerPhoto from '@/components/ui/PlayerPhoto';

interface StatCardProps {
  player: Player;
  showValue: boolean;
  stat: string;
  formattedValue: string;
  difficulty?: string; // "Easy" | "Medium" | "Hard" | "Expert"
}

const buildDifficultyColors = (c: ThemeColors): Record<string, { bg: string; text: string }> => ({
  Easy: { bg: c.accentSoft, text: c.accent },
  Medium: { bg: c.streakSoft, text: c.streak },
  Hard: { bg: c.dangerSoft, text: c.dangerBright },
  Expert: { bg: c.dangerSoft, text: c.danger },
});

export default function StatCard({
  player,
  showValue,
  stat,
  formattedValue,
  difficulty,
}: StatCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const difficultyColors = useMemo(() => buildDifficultyColors(colors), [colors]);
  const diffColor = difficulty ? difficultyColors[difficulty] : undefined;

  return (
    <GlassCard style={layoutStyles.card}>
      <View style={layoutStyles.photoWrap}>
        <PlayerPhoto playerId={player.id} name={player.name} size={56} />
      </View>
      <Text style={styles.playerName} adjustsFontSizeToFit minimumFontScale={0.7} numberOfLines={2}>
        {player.name}
      </Text>
      <View style={layoutStyles.teamRow}>
        <TeamCrest teamName={player.current_team} size={20} />
        <Text style={styles.teamName} numberOfLines={2}>
          {player.current_team}
        </Text>
      </View>
      {difficulty && diffColor && (
        <View style={[layoutStyles.difficultyPill, { backgroundColor: diffColor.bg }]}>
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

// Layout-only styles stay module-scope.
const layoutStyles = StyleSheet.create({
  card: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 180,
  },
  photoWrap: {
    marginBottom: spacing.sm,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  difficultyPill: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.full,
    marginBottom: spacing.sm,
    alignSelf: 'center',
  },
});

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    playerName: {
      ...type.h1,
      color: c.textPrimary,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    teamName: {
      ...type.bodyBold,
      color: c.textSecondary,
    },
    difficultyText: {
      ...type.micro,
      textTransform: 'uppercase',
    },
    statLabel: {
      ...type.captionBold,
      color: c.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: spacing.xs,
    },
    statValue: {
      ...type.display,
      color: c.accent,
      textAlign: 'center',
    },
    statHidden: {
      ...type.display,
      color: c.textPrimary,
      textAlign: 'center',
    },
  });
