import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { spacing, type } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';
import { useSolveTimeStore } from '@/hooks/useSolveTimeStore';
import { formatDuration } from '@/lib/solveTime';
import { getTodayDateString } from '@/lib/dailySeed';

/**
 * Subtle elapsed-time chip for naturally speedy modes (Higher/Lower, Market
 * Movers, Grid) — mono digits, textMuted, updates once per second. Renders
 * nothing until the run's first interaction and disappears once the time is
 * finalized. Thinky modes must NOT mount this (no time pressure by design).
 */
export default function SolveTimeChip({ mode }: { mode: string }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const date = useSolveTimeStore((s) => s.date);
  const entry = useSolveTimeStore((s) => s.byMode[mode]);
  const running = !!entry && entry.elapsedMs == null && date === getTodayDateString();

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);

  if (!running || !entry) return null;
  return <Text style={styles.chip}>⏱ {formatDuration(Math.max(0, now - entry.startedAt))}</Text>;
}

/**
 * Game-over solve-time row: "⏱ 2:41" plus "PB 1:58" (or "New best!" in accent
 * when this run set it). Rendered on every game-over surface immediately below
 * the RankBadge. Shows nothing when no daily time was recorded today (practice
 * runs, pre-feature days). Streak modes pass showBest={false} — a "fastest
 * run" PB is meaningless when longer runs are better.
 */
export function SolveTimeResult({ mode, showBest = true }: { mode: string; showBest?: boolean }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const date = useSolveTimeStore((s) => s.date);
  const entry = useSolveTimeStore((s) => s.byMode[mode]);
  const best = useSolveTimeStore((s) => s.bestByMode[mode]);

  if (date !== getTodayDateString() || !entry || entry.elapsedMs == null) return null;

  return (
    <View style={layoutStyles.row}>
      <Text style={styles.time}>⏱ {formatDuration(entry.elapsedMs)}</Text>
      {showBest &&
        (entry.isNewBest ? (
          <Text style={styles.newBest}>New best!</Text>
        ) : (
          best !== undefined && <Text style={styles.best}>PB {formatDuration(best)}</Text>
        ))}
    </View>
  );
}

// Layout-only styles stay module-scope.
const layoutStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: spacing.sm,
  },
});

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    chip: {
      ...type.score,
      color: c.textMuted,
      marginTop: 2,
    },
    time: {
      ...type.score,
      color: c.textSecondary,
    },
    best: {
      ...type.caption,
      color: c.textMuted,
    },
    newBest: {
      ...type.captionBold,
      color: c.accent,
    },
  });
