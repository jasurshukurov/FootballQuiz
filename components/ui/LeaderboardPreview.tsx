import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import Tappable from '@/components/ui/Tappable';
import UsernameCard from '@/components/ui/UsernameCard';
import { borderRadius, spacing, type } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';
import { useRemoteConfigStore } from '@/hooks/useRemoteConfigStore';
import { FEATURES } from '@/lib/featureFlags';
import { getCachedIdentityId } from '@/lib/awsClient';
import {
  LeaderboardEntry,
  ensureLeaderboardSubmitted,
  fetchLeaderboard,
  fetchMyRank,
  getLocalScores,
} from '@/lib/dynamoSync';

type LoadState = 'loading' | 'ready' | 'error';

/**
 * Stats-tab teaser for the global leaderboard: your username + all-time rank
 * and the current top 3, linking to the full board. Hidden entirely when the
 * leaderboard feature is off (local flag or remote kill switch).
 */
export default function LeaderboardPreview() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const remoteEnabled = useRemoteConfigStore((s) => s.config.leaderboardEnabled !== false);
  const enabled = FEATURES.leaderboard && remoteEnabled;

  const [state, setState] = useState<LoadState>('loading');
  const [top, setTop] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);

  const load = useCallback(async () => {
    setState('loading');
    try {
      await ensureLeaderboardSubmitted();
      const entries = await fetchLeaderboard('alltime', 3);
      setTop(entries);
      const { alltime } = getLocalScores();
      setMyRank(alltime > 0 ? await fetchMyRank('alltime', alltime) : null);
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => {
    if (enabled) void load();
  }, [enabled, load]);

  if (!enabled) return null;

  const myId = getCachedIdentityId();

  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>Leaderboard</Text>
      <UsernameCard />

      <View style={styles.card}>
        {state === 'loading' && (
          <View style={styles.centerBox}>
            <ActivityIndicator color={colors.accent} />
          </View>
        )}

        {state === 'error' && (
          <View style={styles.centerBox}>
            <Text style={styles.stateText}>Couldn&apos;t load the leaderboard.</Text>
            <Tappable
              onPress={() => void load()}
              accessibilityLabel="Retry loading leaderboard"
              hoverStyle={{ backgroundColor: colors.bgCardPressed }}
              style={styles.retryButton}>
              <Text style={styles.retryLabel}>Retry</Text>
            </Tappable>
          </View>
        )}

        {state === 'ready' && top.length === 0 && (
          <View style={styles.centerBox}>
            <Text style={styles.stateText}>
              No scores yet. Finish a daily game to get on the board!
            </Text>
          </View>
        )}

        {state === 'ready' && top.length > 0 && (
          <View>
            {myRank !== null && (
              <View style={styles.rankRow}>
                <FontAwesome name="trophy" size={14} color={colors.streak} />
                <Text style={styles.rankText}>
                  You&apos;re ranked #{myRank} all-time with {getLocalScores().alltime} XP
                </Text>
              </View>
            )}
            {top.map((entry, i) => {
              const isMe = myId !== null && entry.userId === myId;
              return (
                <View key={entry.userId} style={[styles.entryRow, isMe && styles.entryRowMe]}>
                  <Text style={styles.entryRank}>{i + 1}</Text>
                  <Text style={[styles.entryName, isMe && styles.entryNameMe]} numberOfLines={1}>
                    {entry.username}
                    {isMe ? ' (you)' : ''}
                  </Text>
                  <Text style={styles.entryScore}>{entry.score} XP</Text>
                </View>
              );
            })}
          </View>
        )}

        <Tappable
          onPress={() => router.push('/(tabs)/leaderboard' as Href)}
          accessibilityLabel="View full leaderboard"
          hoverStyle={{ backgroundColor: colors.bgCardPressed }}
          style={styles.viewAllRow}>
          <Text style={styles.viewAllLabel}>View full leaderboard</Text>
          <FontAwesome name="chevron-right" size={13} color={colors.textMuted} />
        </Tappable>
      </View>
    </View>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    section: {
      marginBottom: spacing.xl,
    },
    sectionLabel: {
      ...type.micro,
      color: c.textMuted,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
      marginBottom: spacing.md,
    },
    card: {
      marginTop: spacing.sm,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.bgCard,
      overflow: 'hidden',
    },
    centerBox: {
      alignItems: 'center',
      padding: spacing.lg,
      gap: spacing.md,
    },
    stateText: {
      ...type.caption,
      color: c.textSecondary,
      textAlign: 'center',
    },
    retryButton: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      borderRadius: borderRadius.sm,
      borderWidth: 1,
      borderColor: c.accentBorder,
      backgroundColor: c.accentSoft,
    },
    retryLabel: {
      ...type.captionBold,
      color: c.accent,
    },
    rankRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    rankText: {
      ...type.captionBold,
      color: c.textPrimary,
      flex: 1,
    },
    entryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    entryRowMe: {
      backgroundColor: c.accentSoft,
    },
    entryRank: {
      ...type.score,
      color: c.textMuted,
      width: 22,
    },
    entryName: {
      ...type.body,
      color: c.textPrimary,
      flex: 1,
    },
    entryNameMe: {
      ...type.bodyBold,
      color: c.accent,
    },
    entryScore: {
      ...type.score,
      color: c.accent,
    },
    viewAllRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    viewAllLabel: {
      ...type.captionBold,
      color: c.accent,
    },
  });
