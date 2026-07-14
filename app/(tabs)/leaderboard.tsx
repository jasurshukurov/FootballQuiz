import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import Screen from '@/components/ui/Screen';
import ScreenHeader from '@/components/ui/ScreenHeader';
import RetroButton from '@/components/ui/RetroButton';
import Tappable from '@/components/ui/Tappable';
import UsernameCard from '@/components/ui/UsernameCard';
import { borderRadius, spacing, type } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';
import { useIdentityStore } from '@/hooks/useIdentityStore';
import { useRemoteConfigStore } from '@/hooks/useRemoteConfigStore';
import { FEATURES } from '@/lib/featureFlags';
import { getCachedIdentityId } from '@/lib/awsClient';
import {
  LeaderboardBoard,
  LeaderboardEntry,
  ensureLeaderboardSubmitted,
  fetchLeaderboard,
  fetchMyRank,
  getLocalScores,
} from '@/lib/dynamoSync';

const TOP_LIMIT = 50;

type LoadState = 'loading' | 'ready' | 'error';

export default function LeaderboardScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const username = useIdentityStore((s) => s.username);
  const remoteEnabled = useRemoteConfigStore((s) => s.config.leaderboardEnabled !== false);
  const enabled = FEATURES.leaderboard && remoteEnabled;

  const [board, setBoard] = useState<LeaderboardBoard>('daily');
  const [state, setState] = useState<LoadState>('loading');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);

  const load = useCallback(async (which: LeaderboardBoard) => {
    setState('loading');
    try {
      await ensureLeaderboardSubmitted();
      const top = await fetchLeaderboard(which, TOP_LIMIT);
      setEntries(top);
      const scores = getLocalScores();
      const myScore = which === 'daily' ? scores.daily : scores.alltime;
      setMyRank(myScore > 0 ? await fetchMyRank(which, myScore) : null);
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => {
    if (enabled) void load(board);
  }, [enabled, board, load]);

  const myId = getCachedIdentityId();
  const scores = getLocalScores();
  const myScore = board === 'daily' ? scores.daily : scores.alltime;
  const inTopList = myId !== null && entries.some((e) => e.userId === myId);

  if (!enabled) {
    return (
      <Screen>
        <ScreenHeader eyebrow="Global" title="Leaderboard" />
        <View style={styles.stateBox}>
          <FontAwesome name="trophy" size={28} color={colors.textMuted} />
          <Text style={styles.stateTitle}>Leaderboard unavailable</Text>
          <Text style={styles.stateText}>
            The global leaderboard is switched off right now. Check back soon.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader
        eyebrow="Global"
        title="Leaderboard"
        subtitle={board === 'daily' ? 'XP earned today' : 'All-time XP'}
      />

      <UsernameCard />

      {/* Daily / All-Time toggle */}
      <View style={styles.toggleRow}>
        {(
          [
            { key: 'daily', label: 'Daily' },
            { key: 'alltime', label: 'All-Time' },
          ] as const
        ).map((option) => {
          const active = board === option.key;
          return (
            <Tappable
              key={option.key}
              onPress={() => setBoard(option.key)}
              accessibilityLabel={`${option.label} leaderboard`}
              hoverStyle={{ backgroundColor: colors.bgCardPressed }}
              style={[styles.toggleButton, active && styles.toggleButtonActive]}>
              <Text style={[styles.toggleLabel, active && styles.toggleLabelActive]}>
                {option.label}
              </Text>
            </Tappable>
          );
        })}
      </View>

      {state === 'loading' && (
        <View style={styles.stateBox}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={styles.stateText}>Loading the standings…</Text>
        </View>
      )}

      {state === 'error' && (
        <View style={styles.stateBox}>
          <FontAwesome name="wifi" size={28} color={colors.textMuted} />
          <Text style={styles.stateTitle}>Couldn&apos;t load the leaderboard</Text>
          <Text style={styles.stateText}>
            Check your connection and try again. Your scores are saved on this device and will sync
            automatically.
          </Text>
          <RetroButton title="Retry" onPress={() => void load(board)} variant="secondary" />
        </View>
      )}

      {state === 'ready' && entries.length === 0 && (
        <View style={styles.stateBox}>
          <FontAwesome name="flag" size={28} color={colors.textMuted} />
          <Text style={styles.stateTitle}>Nobody on the board yet</Text>
          <Text style={styles.stateText}>
            Finish a daily game and you could be the first name up here.
          </Text>
        </View>
      )}

      {state === 'ready' && entries.length > 0 && (
        <View style={styles.list}>
          {entries.map((entry, i) => {
            const isMe = myId !== null && entry.userId === myId;
            return (
              <View key={`${entry.userId}-${i}`} style={[styles.row, isMe && styles.rowMe]}>
                <Text style={[styles.rowRank, i < 3 && styles.rowRankTop]}>{i + 1}</Text>
                <Text style={[styles.rowName, isMe && styles.rowNameMe]} numberOfLines={1}>
                  {entry.username}
                  {isMe ? ' (you)' : ''}
                </Text>
                <Text style={styles.rowScore}>{entry.score} XP</Text>
              </View>
            );
          })}

          {/* Your row, pinned when you're outside the top list. */}
          {!inTopList && myScore > 0 && (
            <View style={[styles.row, styles.rowMe, styles.pinnedRow]}>
              <Text style={styles.rowRank}>{myRank !== null ? myRank : '·'}</Text>
              <Text style={[styles.rowName, styles.rowNameMe]} numberOfLines={1}>
                {username} (you)
              </Text>
              <Text style={styles.rowScore}>{myScore} XP</Text>
            </View>
          )}
          {!inTopList && myScore === 0 && (
            <Text style={styles.footerHint}>
              {board === 'daily'
                ? 'Earn XP in any of today’s games to join the daily board.'
                : 'Earn XP in any daily game to join the all-time board.'}
            </Text>
          )}
        </View>
      )}
    </Screen>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    toggleRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.lg,
      marginBottom: spacing.lg,
    },
    toggleButton: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: spacing.md,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.bgCard,
    },
    toggleButtonActive: {
      borderColor: c.accentBorder,
      backgroundColor: c.accentSoft,
    },
    toggleLabel: {
      ...type.captionBold,
      color: c.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    toggleLabelActive: {
      color: c.accent,
    },
    stateBox: {
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.xxl,
      paddingHorizontal: spacing.lg,
    },
    stateTitle: {
      ...type.h3,
      color: c.textPrimary,
      textAlign: 'center',
    },
    stateText: {
      ...type.caption,
      color: c.textSecondary,
      textAlign: 'center',
    },
    list: {
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.bgCard,
      overflow: 'hidden',
      marginBottom: spacing.xl,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    rowMe: {
      backgroundColor: c.accentSoft,
    },
    pinnedRow: {
      borderTopWidth: 1,
      borderTopColor: c.accentBorder,
      borderBottomWidth: 0,
    },
    rowRank: {
      ...type.score,
      color: c.textMuted,
      width: 34,
    },
    rowRankTop: {
      color: c.streak,
    },
    rowName: {
      ...type.body,
      color: c.textPrimary,
      flex: 1,
    },
    rowNameMe: {
      ...type.bodyBold,
      color: c.accent,
    },
    rowScore: {
      ...type.score,
      color: c.accent,
    },
    footerHint: {
      ...type.caption,
      color: c.textSecondary,
      textAlign: 'center',
      padding: spacing.lg,
    },
  });
