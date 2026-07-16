import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import GlassCard from '@/components/ui/GlassCard';
import { shortenClubName } from '@/lib/clubNames';
import TeamCrest from '@/components/ui/TeamCrest';
// Portrait doesn't leak the answer (the hidden thing is the player's rank value).
// No inline credit line — attribution lives in lib/playerPhotos.ts and the
// Photo Credits screen.
import PlayerPhoto from '@/components/ui/PlayerPhoto';
import { Player } from '@/types/player';
import { type, spacing, motion } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';

interface ChallengerCardProps {
  player: Player;
  visible: boolean;
  /** Accent eyebrow above the name — an instruction ("Where do they rank?"). */
  eyebrow: string;
}

export default function ChallengerCard({ player, visible, eyebrow }: ChallengerCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const translateX = useSharedValue(visible ? 0 : 80);
  const opacity = useSharedValue(visible ? 1 : 0);

  useEffect(() => {
    if (visible) {
      translateX.value = withSpring(0, motion.spring);
      opacity.value = withSpring(1, motion.spring);
    } else {
      translateX.value = 80;
      opacity.value = 0;
    }
  }, [visible, translateX, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={animatedStyle}>
      <GlassCard style={layoutStyles.card}>
        <View style={layoutStyles.content}>
          <Text style={styles.categoryLabel}>{eyebrow}</Text>
          <PlayerPhoto playerId={player.id} name={player.name} size={48} />
          <Text style={styles.playerName} numberOfLines={1}>
            {player.name}
          </Text>
          <View style={layoutStyles.teamRow}>
            <TeamCrest teamName={shortenClubName(player.current_team)} size={20} />
            <Text style={styles.teamName} numberOfLines={1}>
              {shortenClubName(player.current_team)}
            </Text>
          </View>
          <Text style={styles.position}>{player.position}</Text>
        </View>
      </GlassCard>
    </Animated.View>
  );
}

// Layout-only styles stay module-scope.
const layoutStyles = StyleSheet.create({
  card: {
    marginBottom: spacing.sm,
  },
  // Kept tight: on a 844pt phone this card + 5 rank slots + Give Up must all
  // clear the floating tab bar without scrolling.
  content: {
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    categoryLabel: {
      ...type.micro,
      color: c.accent,
      letterSpacing: 2,
      textTransform: 'uppercase',
    },
    playerName: {
      ...type.h2,
      color: c.textPrimary,
      textAlign: 'center',
    },
    teamName: {
      ...type.captionBold,
      color: c.textSecondary,
    },
    position: {
      ...type.caption,
      color: c.textSecondary,
    },
  });
