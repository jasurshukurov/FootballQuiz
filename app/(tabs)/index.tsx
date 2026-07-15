import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';

import Screen from '@/components/ui/Screen';
import Tappable from '@/components/ui/Tappable';
import ProgressRing from '@/components/ui/ProgressRing';
import StreakFlame from '@/components/ui/StreakFlame';
import DifficultyBanner, { todayBandDisplay } from '@/components/ui/DifficultyBanner';
import { useTheme } from '@/hooks/useTheme';
import { type ThemeColors } from '@/constants/themes';
import { spacing, borderRadius, type, motion, touch, opacity } from '@/constants/theme';
import { getActiveModes, type GameMode } from '@/lib/modeRegistry';
import { useDailyProgressStore } from '@/hooks/useDailyProgressStore';
import { useDailyStateStore } from '@/hooks/useDailyStateStore';
import { useSolveTimeStore } from '@/hooks/useSolveTimeStore';
import { useDisabledModes } from '@/hooks/useRemoteConfigStore';
import { getDailyNumber } from '@/lib/dailyPuzzle';
import { getTodayDateString } from '@/lib/dailySeed';
import { formatDuration } from '@/lib/solveTime';

/** Cap staggered entrances — no `entering` beyond this index. */
const STAGGER_CAP = 12;

/** v3 hub header: greeting/date and "X/11 played today" + streak flame on
 *  the left, a 64pt progress ring on the right (mobile and desktop main
 *  column alike — the desktop sidebar carries its own ring card). */
function HubHeader({
  greeting,
  dateLabel,
  played,
  total,
  allDone,
  streak,
  c,
  styles,
}: {
  greeting: string;
  dateLabel: string;
  played: number;
  total: number;
  allDone: boolean;
  streak: number;
  c: ThemeColors;
  styles: Styles;
}) {
  return (
    <View style={styles.hero}>
      <View style={styles.heroText}>
        <Text style={styles.greeting}>{greeting}</Text>
        <Text style={styles.date}>{dateLabel}</Text>
        <View style={styles.meterRow}>
          <Text style={allDone ? styles.allDoneLabel : styles.meterLabel}>
            {allDone ? 'All done today' : `${played}/${total} played today`}
          </Text>
          {streak > 0 && (
            <View style={styles.streakPill}>
              <StreakFlame size={12} color={c.streak} />
              <Text style={styles.streakText}>{streak}</Text>
            </View>
          )}
        </View>
      </View>
      <ProgressRing
        size={64}
        strokeWidth={5}
        progress={total > 0 ? played / total : 0}
        color={allDone ? c.accentBright : c.accent}
        trackColor={c.bgCard}>
        <Text style={styles.ringText}>
          {played}/{total}
        </Text>
      </ProgressRing>
    </View>
  );
}

function greetingForHour(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatToday(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

type Styles = ReturnType<typeof createStyles>;

/** Large hero card for the FIRST unplayed mode of the day. */
function FeaturedCard({
  mode,
  onPress,
  c,
  glow,
  styles,
}: {
  mode: GameMode;
  onPress: () => void;
  c: ThemeColors;
  glow: readonly [string, string];
  styles: Styles;
}) {
  return (
    <Tappable
      onPress={onPress}
      accessibilityLabel={`Play ${mode.title}`}
      hoverStyle={{ backgroundColor: c.bgCardPressed }}
      style={styles.featuredCard}>
      <LinearGradient
        colors={glow}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.featuredIcon}>
        <FontAwesome name={mode.icon} size={30} color={c.accent} />
      </View>
      <View style={styles.cardText}>
        <View style={styles.featuredEyebrowRow}>
          <Text style={styles.featuredEyebrow}>Up next</Text>
          <View style={styles.difficultyChip}>
            <View style={styles.difficultyDot} />
            <Text style={styles.difficultyChipText}>{todayBandDisplay()}</Text>
          </View>
        </View>
        <Text style={styles.featuredTitle}>{mode.title}</Text>
        <Text style={styles.featuredTease} numberOfLines={2}>
          {mode.tease}
        </Text>
        <View style={styles.playPill}>
          <FontAwesome name="play" size={10} color={c.textOnAccent} />
          <Text style={styles.playPillText}>Play</Text>
        </View>
      </View>
    </Tappable>
  );
}

/** Two-column grid card for a mode not yet played today (Claude Design hub):
 *  icon tile top-left, unplayed dot top-right, title + tease below. */
function ModeGridCard({
  mode,
  onPress,
  c,
  styles,
}: {
  mode: GameMode;
  onPress: () => void;
  c: ThemeColors;
  styles: Styles;
}) {
  return (
    <Tappable
      onPress={onPress}
      accessibilityLabel={`Play ${mode.title}`}
      hoverStyle={{ backgroundColor: c.bgCardPressed }}
      style={styles.gridCard}>
      <View style={styles.gridCardTop}>
        <View style={styles.iconSquare}>
          <FontAwesome name={mode.icon} size={20} color={c.accent} />
        </View>
        <View style={styles.unplayedDot} />
      </View>
      <Text style={styles.cardTitle} numberOfLines={1}>
        {mode.title}
      </Text>
      <Text style={styles.cardTease} numberOfLines={2}>
        {mode.tease}
      </Text>
    </Tappable>
  );
}

/** Compact row for a mode already completed today. Tapping re-opens the result. */
function DoneRow({
  mode,
  score,
  timeLabel,
  onPress,
  c,
  styles,
}: {
  mode: GameMode;
  score?: number;
  timeLabel?: string;
  onPress: () => void;
  c: ThemeColors;
  styles: Styles;
}) {
  return (
    <Tappable
      onPress={onPress}
      accessibilityLabel={`${mode.title}, done today`}
      hoverStyle={{ backgroundColor: c.bgCardPressed }}
      style={styles.doneRow}>
      <FontAwesome name="check-circle" size={16} color={c.accent} />
      <Text style={styles.doneTitle} numberOfLines={1}>
        {mode.title}
      </Text>
      {timeLabel !== undefined && <Text style={styles.doneTime}>⏱ {timeLabel}</Text>}
      {score !== undefined && <Text style={styles.doneScore}>{score}</Text>}
    </Tappable>
  );
}

export default function TodayScreen() {
  const router = useRouter();
  const { colors, gradients } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const completedModes = useDailyProgressStore((s) => s.completedModes);
  const scoresByMode = useDailyProgressStore((s) => s.scoresByMode);
  const solveTimesByMode = useSolveTimeStore((s) => s.byMode);
  const solveTimesDate = useSolveTimeStore((s) => s.date);
  const checkAndResetForNewDay = useDailyProgressStore((s) => s.checkAndResetForNewDay);
  const currentStreak = useDailyStateStore((s) => s.currentStreak);
  // Subscribe so a remote-config change re-renders the feed.
  useDisabledModes();

  useEffect(() => {
    checkAndResetForNewDay();
  }, [checkAndResetForNewDay]);

  const now = new Date();
  const greeting = greetingForHour(now.getHours());
  const dateLabel = formatToday(now);
  const dailyNumber = getDailyNumber();

  const modes = getActiveModes();
  const { unplayed, done } = useMemo(() => {
    const up: GameMode[] = [];
    const dn: GameMode[] = [];
    for (const m of modes) {
      if (completedModes[m.key]) dn.push(m);
      else up.push(m);
    }
    return { unplayed: up, done: dn };
  }, [modes, completedModes]);

  const total = modes.length;
  const playedCount = done.length;
  const allDone = total > 0 && playedCount === total;

  const openMode = (mode: GameMode) => {
    router.navigate(mode.route as Href);
  };

  const featured = unplayed[0];
  const rest = unplayed.slice(1);

  return (
    <Screen>
      {/* ── v3 hero: greeting + date + played/streak, ring on the right ── */}
      <HubHeader
        greeting={greeting}
        dateLabel={dateLabel}
        played={playedCount}
        total={total}
        allDone={allDone}
        streak={currentStreak}
        c={colors}
        styles={styles}
      />

      {/* ── Weekly difficulty ramp (shared curve, data-driven) ── */}
      <View style={styles.bannerWrap}>
        <DifficultyBanner />
      </View>

      {/* ── Up next: featured hero card + two-column mode grid ── */}
      {unplayed.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Up next</Text>
          <View style={styles.cardList}>
            {featured && (
              <Animated.View entering={FadeInDown.duration(motion.base)}>
                <FeaturedCard
                  mode={featured}
                  onPress={() => openMode(featured)}
                  c={colors}
                  glow={gradients.activeGlow}
                  styles={styles}
                />
              </Animated.View>
            )}
            <View style={styles.grid}>
              {rest.map((mode, i) => {
                const idx = i + 1; // featured card is index 0
                const card = (
                  <ModeGridCard
                    mode={mode}
                    onPress={() => openMode(mode)}
                    c={colors}
                    styles={styles}
                  />
                );
                return idx < STAGGER_CAP ? (
                  <Animated.View
                    key={mode.key}
                    style={styles.gridItem}
                    entering={FadeInDown.delay(idx * 40).duration(motion.base)}>
                    {card}
                  </Animated.View>
                ) : (
                  <View key={mode.key} style={styles.gridItem}>
                    {card}
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      )}

      {/* ── Done today: compact result rows ── */}
      {done.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Done today</Text>
          <View style={styles.doneList}>
            {done.map((mode) => {
              const elapsedMs =
                solveTimesDate === getTodayDateString()
                  ? solveTimesByMode[mode.key]?.elapsedMs
                  : undefined;
              return (
                <DoneRow
                  key={mode.key}
                  mode={mode}
                  score={scoresByMode[mode.key]}
                  timeLabel={elapsedMs != null ? formatDuration(elapsedMs) : undefined}
                  onPress={() => openMode(mode)}
                  c={colors}
                  styles={styles}
                />
              );
            })}
          </View>
        </View>
      )}

      {/* ── Archive entry (visually subordinate) ── */}
      <Tappable
        onPress={() => router.push('/(tabs)/archive' as Href)}
        accessibilityLabel="Archive, replay past days"
        hoverStyle={{ backgroundColor: colors.bgCardPressed }}
        style={styles.archiveCard}>
        <FontAwesome name="calendar" size={16} color={colors.textMuted} />
        <View style={styles.cardText}>
          <Text style={styles.archiveTitle}>Archive</Text>
          <Text style={styles.archiveSub} numberOfLines={1}>
            Replay past days with no effect on your streak
          </Text>
        </View>
        <FontAwesome name="chevron-right" size={13} color={colors.textMuted} />
      </Tappable>

      <Text style={styles.footerNote}>Football Daily #{dailyNumber}</Text>
    </Screen>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    hero: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.lg,
      marginBottom: spacing.md,
    },
    heroText: {
      flex: 1,
    },
    greeting: {
      ...type.h1,
      color: c.textPrimary,
    },
    date: {
      ...type.caption,
      color: c.textSecondary,
      marginTop: spacing.xs,
    },
    meterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    meterLabel: {
      ...type.captionBold,
      color: c.textSecondary,
    },
    allDoneLabel: {
      ...type.captionBold,
      color: c.accentBright,
    },
    ringText: {
      ...type.score,
      fontSize: type.caption.fontSize,
      lineHeight: type.caption.lineHeight,
      color: c.textPrimary,
    },
    streakPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: borderRadius.full,
      backgroundColor: c.streakSoft,
    },
    streakText: {
      ...type.captionBold,
      color: c.streak,
    },
    bannerWrap: {
      marginBottom: spacing.lg,
    },
    section: {
      marginBottom: spacing.lg,
    },
    sectionLabel: {
      ...type.micro,
      color: c.textMuted,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
      marginBottom: spacing.sm,
    },
    cardList: {
      gap: spacing.md,
    },
    // Featured "Up Next" hero card
    featuredCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.lg,
      padding: spacing.lg,
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: c.accentBorder,
      backgroundColor: c.bgCard,
      overflow: 'hidden',
    },
    featuredIcon: {
      width: 64,
      height: 64,
      borderRadius: borderRadius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.accentSoft,
    },
    featuredEyebrowRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: 2,
    },
    featuredEyebrow: {
      ...type.micro,
      color: c.accent,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
    },
    difficultyChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.sm,
      paddingVertical: 1,
      borderRadius: borderRadius.full,
      borderWidth: 1,
      borderColor: c.accentBorder,
    },
    difficultyDot: {
      width: 6,
      height: 6,
      borderRadius: borderRadius.full,
      backgroundColor: c.accent,
    },
    difficultyChipText: {
      ...type.micro,
      color: c.accentBright,
    },
    featuredTitle: {
      ...type.h2,
      color: c.textPrimary,
    },
    featuredTease: {
      ...type.caption,
      color: c.textSecondary,
      marginTop: 2,
    },
    playPill: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: spacing.xs,
      marginTop: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.full,
      backgroundColor: c.accent,
    },
    playPillText: {
      ...type.captionBold,
      color: c.textOnAccent,
    },
    // Two-column unplayed mode grid
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
    },
    gridItem: {
      flexBasis: '47%',
      flexGrow: 1,
    },
    gridCard: {
      // Fill the stretched grid item so both cards in a row render the same
      // height even when one tease wraps to a second line.
      flex: 1,
      minHeight: 96,
      padding: spacing.md,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.bgCard,
    },
    gridCardTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
    },
    unplayedDot: {
      width: 6,
      height: 6,
      borderRadius: borderRadius.full,
      backgroundColor: c.accent,
      marginTop: spacing.xs,
    },
    iconSquare: {
      width: 38,
      height: 38,
      borderRadius: borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.accentSoft,
    },
    cardText: {
      flex: 1,
    },
    cardTitle: {
      ...type.h3,
      color: c.textPrimary,
    },
    cardTease: {
      ...type.micro,
      color: c.textSecondary,
      marginTop: 2,
    },
    // Done rows
    doneList: {
      gap: spacing.sm,
    },
    doneRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      minHeight: touch.min,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.bgCard,
      opacity: opacity.high,
    },
    doneTitle: {
      ...type.bodyBold,
      color: c.textSecondary,
      flex: 1,
    },
    doneScore: {
      ...type.score,
      color: c.accent,
    },
    doneTime: {
      ...type.caption,
      color: c.textMuted,
    },
    // Archive entry
    archiveCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      minHeight: touch.min,
      padding: spacing.md,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.bgElevated,
    },
    archiveTitle: {
      ...type.bodyBold,
      color: c.textSecondary,
    },
    archiveSub: {
      ...type.caption,
      color: c.textMuted,
      marginTop: 1,
    },
    footerNote: {
      ...type.micro,
      color: c.textMuted,
      textAlign: 'center',
      marginTop: spacing.xl,
    },
  });
