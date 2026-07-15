import React, { useMemo, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import Screen from '@/components/ui/Screen';
import ScreenHeader from '@/components/ui/ScreenHeader';
import AnimatedBar from '@/components/ui/AnimatedBar';
import ThemePicker from '@/components/ui/ThemePicker';
import NotificationSettings from '@/components/ui/NotificationSettings';
import { spacing, borderRadius, type } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';
import { useDailyStateStore } from '@/hooks/useDailyStateStore';
import { useDailyProgressStore } from '@/hooks/useDailyProgressStore';
import { useManagerStore } from '@/hooks/useManagerStore';
import { GAME_MODES } from '@/lib/modeRegistry';
import { isHapticsEnabled, setHapticsEnabled, triggerImpact } from '@/lib/haptics';

function HeadlineStat({
  value,
  label,
  styles,
}: {
  value: string;
  label: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.headlineStat}>
      <Text style={styles.headlineValue}>{value}</Text>
      <Text style={styles.headlineLabel}>{label}</Text>
    </View>
  );
}

export default function StatsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { currentStreak, maxStreak, gamesPlayed, gamesWon, guessDistribution } =
    useDailyStateStore();
  const perfectDays = useDailyProgressStore((s) => s.perfectDays);
  const totalXp = useManagerStore((s) => s.totalXp);
  const xpByMode = useManagerStore((s) => s.xpByMode);
  const gamesCompletedByMode = useManagerStore((s) => s.gamesCompletedByMode);

  const [hapticsOn, setHapticsOn] = useState(isHapticsEnabled());

  const winRate = gamesPlayed > 0 ? Math.round((gamesWon / gamesPlayed) * 100) : 0;
  const maxDistribution = Math.max(...guessDistribution, 0);
  const hasDistribution = guessDistribution.some((c) => c > 0);

  const playedModes = GAME_MODES.filter((m) => (gamesCompletedByMode[m.key] ?? 0) > 0);

  const handleToggleHaptics = (value: boolean) => {
    setHapticsOn(value);
    setHapticsEnabled(value);
    if (value) triggerImpact();
  };

  return (
    <Screen>
      <ScreenHeader eyebrow="Your season" title="Stats" />

      {/* Streak hero */}
      <View style={styles.hero}>
        <View style={styles.streakRow}>
          <FontAwesome name="fire" size={34} color={colors.streak} />
          <Text style={styles.streakNumber}>{currentStreak}</Text>
        </View>
        <Text style={styles.streakLabel}>day streak</Text>
      </View>

      {/* Headline stats */}
      <View style={styles.headlineRow}>
        <HeadlineStat value={String(maxStreak)} label="Best streak" styles={styles} />
        <HeadlineStat value={String(perfectDays)} label="Perfect days" styles={styles} />
        <HeadlineStat value={String(totalXp)} label="XP" styles={styles} />
      </View>

      {/* Leaderboard teaser removed 2026-07-14 (user call: personal scores only
          for now) — LeaderboardPreview and the /leaderboard route still exist
          if it comes back. */}

      {/* Per-mode stat cards */}
      {playedModes.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>By mode</Text>
          <View style={styles.modeList}>
            {playedModes.map((mode) => (
              <View key={mode.key} style={styles.modeCard}>
                <View style={styles.modeIconSquare}>
                  <FontAwesome name={mode.icon} size={16} color={colors.accent} />
                </View>
                <View style={styles.modeText}>
                  <Text style={styles.modeTitle}>{mode.title}</Text>
                  <Text style={styles.modeSub}>{gamesCompletedByMode[mode.key] ?? 0} played</Text>
                </View>
                <Text style={styles.modeXp}>{xpByMode[mode.key] ?? 0} XP</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* My name is... distribution */}
      {hasDistribution && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>My name is… · guess distribution</Text>
          <Text style={styles.sectionNote}>
            {gamesPlayed} played · {winRate}% solved
          </Text>
          <View style={styles.distList}>
            {guessDistribution.map((count, i) => (
              <AnimatedBar
                key={i}
                label={String(i + 1)}
                value={count}
                maxValue={maxDistribution}
                index={i}
                barColor={colors.accent}
              />
            ))}
          </View>
        </View>
      )}

      {/* Appearance */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Appearance</Text>
        <ThemePicker />
        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Text style={styles.switchLabel}>Haptics</Text>
            <Text style={styles.switchCaption}>Subtle vibration on taps and wins</Text>
          </View>
          <Switch
            value={hapticsOn}
            onValueChange={handleToggleHaptics}
            trackColor={{ false: colors.border, true: colors.accentBorder }}
            thumbColor={hapticsOn ? colors.accent : colors.textMuted}
            accessibilityLabel="Haptics"
          />
        </View>
      </View>

      {/* Notifications */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Notifications</Text>
        <NotificationSettings />
      </View>
    </Screen>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    hero: {
      alignItems: 'center',
      marginBottom: spacing.xl,
    },
    streakRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    streakNumber: {
      ...type.display,
      color: c.textPrimary,
    },
    streakLabel: {
      ...type.captionBold,
      color: c.streak,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginTop: spacing.xs,
    },
    headlineRow: {
      flexDirection: 'row',
      gap: spacing.md,
      marginBottom: spacing.xl,
    },
    headlineStat: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: spacing.lg,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.bgCard,
    },
    headlineValue: {
      ...type.scoreLarge,
      color: c.accent,
    },
    headlineLabel: {
      ...type.micro,
      color: c.textMuted,
      textTransform: 'uppercase',
      marginTop: spacing.xs,
      textAlign: 'center',
    },
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
    sectionNote: {
      ...type.caption,
      color: c.textSecondary,
      marginTop: -spacing.sm,
      marginBottom: spacing.md,
    },
    modeList: {
      gap: spacing.sm,
    },
    modeCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.bgCard,
    },
    modeIconSquare: {
      width: 36,
      height: 36,
      borderRadius: borderRadius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.accentSoft,
    },
    modeText: {
      flex: 1,
    },
    modeTitle: {
      ...type.bodyBold,
      color: c.textPrimary,
    },
    modeSub: {
      ...type.caption,
      color: c.textSecondary,
      marginTop: 1,
    },
    modeXp: {
      ...type.score,
      color: c.accent,
    },
    distList: {
      gap: spacing.sm,
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginTop: spacing.md,
      padding: spacing.md,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.bgCard,
    },
    switchText: {
      flex: 1,
    },
    switchLabel: {
      ...type.bodyBold,
      color: c.textPrimary,
    },
    switchCaption: {
      ...type.caption,
      color: c.textSecondary,
      marginTop: 2,
    },
  });
