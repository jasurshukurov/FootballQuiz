import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Player } from '@/types/player';
import { shortenClubName } from '@/lib/clubNames';
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
  /** Phone-height layout: tighter paddings + smaller type so two stacked
   *  cards and the answer buttons all fit above the floating tab bar. */
  compact?: boolean;
  /** Very short viewports only: drop the portrait to buy back height. */
  hidePhoto?: boolean;
  /** Shortest viewports (mobile Safari + URL bar): also drop the difficulty
   *  pill and stat label so name/club/value never clip at the card edges. */
  minimal?: boolean;
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
  compact = false,
  hidePhoto = false,
  minimal = false,
}: StatCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const difficultyColors = useMemo(() => buildDifficultyColors(colors), [colors]);
  const diffColor = difficulty ? difficultyColors[difficulty] : undefined;

  return (
    <GlassCard style={compact ? layoutStyles.cardCompact : layoutStyles.card}>
      {!hidePhoto && (
        <View style={layoutStyles.photoWrap}>
          <PlayerPhoto playerId={player.id} name={player.name} size={compact ? 44 : 56} />
        </View>
      )}
      <Text
        style={compact ? styles.playerNameCompact : styles.playerName}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        numberOfLines={compact ? 1 : 2}>
        {player.name}
      </Text>
      <View style={compact ? layoutStyles.teamRowCompact : layoutStyles.teamRow}>
        <TeamCrest teamName={shortenClubName(player.current_team)} size={20} />
        <Text style={styles.teamName} numberOfLines={compact ? 1 : 2}>
          {shortenClubName(player.current_team)}
        </Text>
      </View>
      {!minimal && difficulty && diffColor && (
        <View
          style={[
            compact ? layoutStyles.difficultyPillCompact : layoutStyles.difficultyPill,
            { backgroundColor: diffColor.bg },
          ]}>
          <Text style={[styles.difficultyText, { color: diffColor.text }]}>{difficulty}</Text>
        </View>
      )}
      {!minimal && <Text style={styles.statLabel}>{stat}</Text>}
      {showValue ? (
        <PopInView>
          <Text style={compact ? styles.statValueCompact : styles.statValue}>{formattedValue}</Text>
        </PopInView>
      ) : (
        <Text style={compact ? styles.statHiddenCompact : styles.statHidden}>?</Text>
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
  // flex:1 lets two stacked cards split whatever height the phone leaves
  // between the header and the pinned answer buttons.
  cardCompact: {
    flex: 1,
    minHeight: 0,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
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
  teamRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  difficultyPill: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.full,
    marginBottom: spacing.sm,
    alignSelf: 'center',
  },
  difficultyPillCompact: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.full,
    marginBottom: spacing.xs,
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
    // flexShrink 0 on the compact text rows: inside the flexed card, overflow
    // must clip at the card edge — never crush a line to 0 height.
    playerNameCompact: {
      ...type.h3,
      color: c.textPrimary,
      textAlign: 'center',
      marginBottom: spacing.xs,
      flexShrink: 0,
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
    statValueCompact: {
      ...type.h2,
      color: c.accent,
      textAlign: 'center',
      flexShrink: 0,
    },
    statHidden: {
      ...type.display,
      color: c.textPrimary,
      textAlign: 'center',
    },
    statHiddenCompact: {
      ...type.h2,
      color: c.textPrimary,
      textAlign: 'center',
      flexShrink: 0,
    },
  });
