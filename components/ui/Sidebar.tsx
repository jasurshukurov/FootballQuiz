import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { usePathname, useRouter, type Href } from 'expo-router';

import Tappable from '@/components/ui/Tappable';
import ProgressRing from '@/components/ui/ProgressRing';
import StreakFlame from '@/components/ui/StreakFlame';
import NextPuzzleCountdown from '@/components/ui/NextPuzzleCountdown';
import { useTheme } from '@/hooks/useTheme';
import { type ThemeColors } from '@/constants/themes';
import { spacing, borderRadius, type, touch, fonts } from '@/constants/theme';
import { getActiveModes } from '@/lib/modeRegistry';
import { useDailyProgressStore } from '@/hooks/useDailyProgressStore';
import { useDailyStateStore } from '@/hooks/useDailyStateStore';
import { useDisabledModes } from '@/hooks/useRemoteConfigStore';

/** Fixed sidebar width for the desktop-web two-pane layout. */
export const SIDEBAR_WIDTH = 280;

interface NavItem {
  label: string;
  route: string;
  icon: React.ComponentProps<typeof FontAwesome>['name'];
}

// Mirrors the three visible tabs (Screen order: Today / Stats / More).
const NAV_ITEMS: NavItem[] = [
  { label: 'Today', route: '/', icon: 'calendar-check-o' },
  { label: 'Stats', route: '/profile', icon: 'bar-chart' },
  { label: 'More', route: '/support', icon: 'ellipsis-h' },
];

/**
 * Desktop-web sidebar (>= WEB_DESKTOP_BREAKPOINT). Persistent left nav that
 * replaces the floating tab bar: wordmark, vertical nav, today's progress ring
 * + streak, and the next-daily countdown. Reads the daily zustand stores so it
 * re-renders live as the day's progress changes.
 */
export default function Sidebar() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const pathname = usePathname();
  // Subscribe so a remote-config change re-renders the ring's N.
  useDisabledModes();

  const completedModes = useDailyProgressStore((s) => s.completedModes);
  const currentStreak = useDailyStateStore((s) => s.currentStreak);

  const modes = getActiveModes();
  const total = modes.length;
  const played = modes.filter((m) => completedModes[m.key]).length;
  const allDone = total > 0 && played === total;

  return (
    <View style={styles.container}>
      {/* ── Wordmark ── */}
      <View style={styles.brand}>
        <FontAwesome name="futbol-o" size={22} color={colors.accent} />
        <Text style={styles.wordmark}>FOOTBALL DAILY</Text>
      </View>

      {/* ── Vertical nav ── */}
      <View style={styles.nav}>
        {NAV_ITEMS.map((item) => {
          const active = item.route === '/' ? pathname === '/' : pathname === item.route;
          return (
            <Tappable
              key={item.route}
              onPress={() => router.navigate(item.route as Href)}
              accessibilityLabel={item.label}
              hoverStyle={{ backgroundColor: colors.bgCardPressed }}
              style={[styles.navRow, active && styles.navRowActive]}>
              <FontAwesome
                name={item.icon}
                size={18}
                color={active ? colors.accent : colors.textSecondary}
              />
              <Text style={active ? styles.navLabelActive : styles.navLabel}>{item.label}</Text>
            </Tappable>
          );
        })}
      </View>

      {/* Cards sit at the bottom of the full-height rail. */}
      <View style={styles.spacer} />

      {/* ── Progress ring + streak ── */}
      <View style={styles.card}>
        <ProgressRing
          size={72}
          strokeWidth={6}
          progress={total > 0 ? played / total : 0}
          color={allDone ? colors.accentBright : colors.accent}
          trackColor={colors.bgCard}>
          <Text style={styles.ringText}>
            {played}/{total}
          </Text>
        </ProgressRing>
        <View style={styles.cardMeta}>
          <Text style={allDone ? styles.playedLabelDone : styles.playedLabel}>
            {allDone ? 'All done today' : 'Played today'}
          </Text>
          {currentStreak > 0 && (
            <View style={styles.streakPill}>
              <StreakFlame size={12} color={colors.streak} />
              <Text style={styles.streakText}>{currentStreak}</Text>
            </View>
          )}
        </View>
      </View>

      {/* ── Next daily countdown ── */}
      <View style={styles.card}>
        <NextPuzzleCountdown label="Next daily in" />
      </View>
    </View>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: {
      width: SIDEBAR_WIDTH,
      padding: spacing.xl,
      borderRightWidth: 1,
      borderRightColor: c.border,
      // Transparent over the shared gradient the two-pane layout paints behind.
      backgroundColor: 'transparent',
    },
    brand: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.xxl,
    },
    wordmark: {
      ...type.h2,
      fontFamily: fonts.heading,
      color: c.textPrimary,
      letterSpacing: 1,
      flexShrink: 1,
    },
    nav: {
      gap: spacing.xs,
    },
    navRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      minHeight: touch.min,
      paddingHorizontal: spacing.md,
      borderRadius: borderRadius.md,
    },
    navRowActive: {
      backgroundColor: c.accentSoft,
    },
    navLabel: {
      ...type.bodyBold,
      color: c.textSecondary,
    },
    navLabelActive: {
      ...type.bodyBold,
      color: c.accent,
    },
    spacer: {
      flex: 1,
      minHeight: spacing.xl,
    },
    card: {
      marginTop: spacing.md,
      padding: spacing.lg,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.bgCard,
      alignItems: 'center',
      gap: spacing.md,
    },
    ringText: {
      ...type.score,
      color: c.textPrimary,
    },
    cardMeta: {
      alignItems: 'center',
      gap: spacing.sm,
    },
    playedLabel: {
      ...type.captionBold,
      color: c.textSecondary,
    },
    playedLabelDone: {
      ...type.captionBold,
      color: c.accentBright,
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
  });
