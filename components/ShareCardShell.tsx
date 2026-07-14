import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { type, spacing, borderRadius, fonts } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';
import { useDailyStateStore } from '@/hooks/useDailyStateStore';

interface ShareCardShellProps {
  /** Mode name, rendered as the condensed uppercase headline. */
  title: string;
  /** Daily number for the header badge; null hides the "#N" (practice). */
  dailyNumber?: number | null;
  /** Bottom-left verdict, e.g. "GOT IT IN 3" or "7/11". */
  verdict: string;
  /** Verdict color momentum: true = accentBright, false = textSecondary. */
  won?: boolean;
  /** Mode-specific middle content (glyph grids, scores). */
  children?: React.ReactNode;
}

/**
 * The share-card chrome per the Claude Design share-card spec: card gradient
 * with an accent border, "⚽ FOOTBALL DAILY #N" badge with the streak flame
 * top-right, condensed mode title, mode content, and a bordered footer with
 * the verdict + site. Spoiler-free by contract: children must never contain
 * the answer.
 */
export default function ShareCardShell({
  title,
  dailyNumber = null,
  verdict,
  won = true,
  children,
}: ShareCardShellProps) {
  const { colors, gradients } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const streak = useDailyStateStore((s) => s.currentStreak);

  return (
    <LinearGradient
      colors={gradients.cardBg}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <FontAwesome name="futbol-o" size={13} color={colors.accent} />
          <Text style={styles.badgeText}>
            FOOTBALL DAILY{dailyNumber != null ? ` #${dailyNumber}` : ''}
          </Text>
        </View>
        {streak > 0 && <Text style={styles.streak}>🔥 {streak}</Text>}
      </View>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.content}>{children}</View>
      <View style={styles.footer}>
        <Text style={[styles.verdict, { color: won ? colors.accentBright : colors.textSecondary }]}>
          {verdict}
        </Text>
        <Text style={styles.site}>footballquiz.app</Text>
      </View>
    </LinearGradient>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: {
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: c.accentBorder,
      // Solid canvas under the translucent gradient — react-native-view-shot
      // captures must never end up with a transparent background.
      backgroundColor: c.bgBase,
      paddingVertical: spacing.xl,
      paddingHorizontal: spacing.xl,
      minWidth: 320,
      maxWidth: 420,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    badgeText: {
      ...type.micro,
      color: c.accent,
      letterSpacing: 1.5,
    },
    streak: {
      ...type.score,
      fontSize: type.caption.fontSize,
      lineHeight: type.caption.lineHeight,
      color: c.streak,
    },
    title: {
      ...type.h1,
      color: c.textPrimary,
      textTransform: 'uppercase',
      marginTop: spacing.md,
    },
    content: {
      alignItems: 'center',
      marginVertical: spacing.lg,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      borderTopWidth: 1,
      borderTopColor: c.border,
      paddingTop: spacing.md,
    },
    verdict: {
      fontFamily: fonts.scoreboard,
      fontSize: type.body.fontSize,
      lineHeight: type.body.lineHeight,
    },
    site: {
      ...type.caption,
      color: c.textMuted,
    },
  });
