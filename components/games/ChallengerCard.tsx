import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import GlassCard from '@/components/ui/GlassCard';
import TeamCrest from '@/components/ui/TeamCrest';
import { Player } from '@/types/player';
import { colors, fonts, spacing } from '@/constants/theme';

interface ChallengerCardProps {
  player: Player;
  visible: boolean;
  categoryTitle: string;
}

export default function ChallengerCard({ player, visible, categoryTitle }: ChallengerCardProps) {
  const translateX = useSharedValue(visible ? 0 : 80);
  const opacity = useSharedValue(visible ? 1 : 0);

  useEffect(() => {
    if (visible) {
      translateX.value = withSpring(0, { damping: 15, stiffness: 100 });
      opacity.value = withSpring(1, { damping: 15, stiffness: 100 });
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
      <GlassCard style={styles.card}>
        <View style={styles.content}>
          <Text style={styles.categoryLabel}>{categoryTitle}</Text>
          <Text style={styles.playerName} numberOfLines={1}>
            {player.name}
          </Text>
          <View style={styles.teamRow}>
            <TeamCrest teamName={player.current_team} size={20} />
            <Text style={styles.teamName} numberOfLines={1}>
              {player.current_team}
            </Text>
          </View>
          <Text style={styles.position}>{player.position}</Text>
        </View>
      </GlassCard>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  content: {
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  categoryLabel: {
    fontFamily: fonts.subheading,
    fontSize: 11,
    color: colors.pitchGreen,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  playerName: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.chalkWhite,
    textAlign: 'center',
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  teamName: {
    fontFamily: fonts.subheading,
    fontSize: 14,
    color: colors.steelGray,
  },
  position: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.steelGray,
  },
});
