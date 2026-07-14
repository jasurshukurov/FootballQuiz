import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import Tappable from '@/components/ui/Tappable';
import { borderRadius, spacing, type } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';
import { useIdentityStore } from '@/hooks/useIdentityStore';
import { queueLeaderboardSync } from '@/lib/dynamoSync';

/**
 * "Playing as <username>" row with a shuffle control. No login anywhere:
 * the name is a locally generated, random football-flavored handle that is
 * shown on the global leaderboard. Used on the Stats and More surfaces.
 */
export default function UsernameCard({ compact = false }: { compact?: boolean }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const username = useIdentityStore((s) => s.username);
  const shuffleUsername = useIdentityStore((s) => s.shuffleUsername);

  const handleShuffle = () => {
    shuffleUsername();
    // The identity-store subscription also queues a sync; this is just a
    // safety net in case sync wiring has not initialized yet.
    queueLeaderboardSync();
  };

  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <View style={styles.iconSquare}>
        <FontAwesome name="user" size={16} color={colors.accent} />
      </View>
      <View style={styles.text}>
        <Text style={styles.label}>Playing as</Text>
        <Text style={styles.username} numberOfLines={1}>
          {username}
        </Text>
      </View>
      <Tappable
        onPress={handleShuffle}
        accessibilityLabel="Shuffle username"
        hoverStyle={{ backgroundColor: colors.bgCardPressed }}
        style={styles.shuffleButton}>
        <FontAwesome name="random" size={14} color={colors.accent} />
        <Text style={styles.shuffleLabel}>Shuffle</Text>
      </Tappable>
    </View>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.bgCard,
    },
    cardCompact: {
      borderWidth: 0,
      borderRadius: 0,
      backgroundColor: 'transparent',
    },
    iconSquare: {
      width: 36,
      height: 36,
      borderRadius: borderRadius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.accentSoft,
    },
    text: {
      flex: 1,
    },
    label: {
      ...type.micro,
      color: c.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    username: {
      ...type.bodyBold,
      color: c.textPrimary,
      marginTop: 1,
    },
    shuffleButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: borderRadius.sm,
      borderWidth: 1,
      borderColor: c.accentBorder,
      backgroundColor: c.accentSoft,
    },
    shuffleLabel: {
      ...type.captionBold,
      color: c.accent,
    },
  });
