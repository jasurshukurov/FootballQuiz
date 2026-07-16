import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import HowToPlaySheet from '@/components/ui/HowToPlaySheet';
import Tappable from '@/components/ui/Tappable';
import { borderRadius, spacing, type } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';
import { useTutorialStore } from '@/hooks/useTutorialStore';

interface ScreenHeaderProps {
  title: string;
  /** Small line above the title, e.g. "DAILY #214" or the mode name. */
  eyebrow?: string;
  /** Line under the title, e.g. instructions or date. */
  subtitle?: string;
  /** Right-aligned slot (streak badge, lives, timer). */
  right?: React.ReactNode;
  /** Today's difficulty tier (todayBandDisplay vocabulary) — renders a small
   *  accent chip beside the eyebrow. Omit on practice/archive runs and on
   *  modes that already show a per-puzzle TierBadge. */
  difficulty?: string;
  /**
   * Mode registry key. When set, the header shows a "?" how-to-play button
   * and auto-opens the rules sheet ONCE on the mode's first-ever visit
   * (persisted via useTutorialStore).
   */
  modeKey?: string;
}

/** Standard in-body screen header — one look for all modes. */
export default function ScreenHeader({
  title,
  eyebrow,
  subtitle,
  right,
  modeKey,
  difficulty,
}: ScreenHeaderProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [sheetOpen, setSheetOpen] = useState(false);
  // Auto-show gate: only after the persisted store hydrated (no flash for
  // returning users) and only if this mode was never seen.
  const autoShow = useTutorialStore((s) => !!modeKey && s.hydrated && !s.seenTutorials[modeKey]);
  const markSeen = useTutorialStore((s) => s.markSeen);

  useEffect(() => {
    if (autoShow) setSheetOpen(true);
  }, [autoShow]);

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    if (modeKey) markSeen(modeKey);
  }, [modeKey, markSeen]);

  return (
    <View style={layout.container}>
      <View style={layout.textBlock}>
        {eyebrow || difficulty ? (
          <View style={layout.eyebrowRow}>
            {eyebrow ? <Text style={styles.eyebrow}>{eyebrow.toUpperCase()}</Text> : null}
            {difficulty ? (
              <View style={styles.difficultyChip}>
                <View style={styles.difficultyDot} />
                <Text style={styles.difficultyText}>{difficulty}</Text>
              </View>
            ) : null}
          </View>
        ) : null}
        <Text style={styles.title}>{title.toUpperCase()}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {modeKey || right ? (
        <View style={layout.right}>
          {modeKey ? (
            <Tappable
              onPress={() => setSheetOpen(true)}
              haptic="impact"
              accessibilityLabel="How to play"
              testID="how-to-play-button"
              // Visual stays 32pt; hit area meets the 44pt touch minimum.
              hitSlop={8}
              style={({ pressed }) => [
                styles.infoButton,
                pressed ? { backgroundColor: colors.bgCardPressed } : null,
              ]}
              hoverStyle={{ backgroundColor: colors.bgCardPressed }}>
              <Text style={styles.infoGlyph}>?</Text>
            </Tappable>
          ) : null}
          {right}
        </View>
      ) : null}
      {modeKey ? (
        <HowToPlaySheet modeKey={modeKey} visible={sheetOpen} onClose={closeSheet} />
      ) : null}
    </View>
  );
}

const layout = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  textBlock: {
    flex: 1,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    eyebrow: {
      ...type.micro,
      color: c.accent,
      letterSpacing: 1.5,
      marginBottom: 2,
    },
    difficultyChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.sm,
      paddingVertical: 1,
      borderRadius: borderRadius.full,
      backgroundColor: c.accentSoft,
    },
    difficultyDot: {
      width: 5,
      height: 5,
      borderRadius: borderRadius.full,
      backgroundColor: c.accent,
    },
    difficultyText: {
      ...type.micro,
      color: c.accent,
    },
    title: {
      ...type.h1,
      color: c.textPrimary,
    },
    subtitle: {
      ...type.caption,
      color: c.textSecondary,
      marginTop: 2,
    },
    infoButton: {
      width: 32,
      height: 32,
      borderRadius: borderRadius.full,
      backgroundColor: c.bgCard,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    infoGlyph: {
      ...type.captionBold,
      color: c.accent,
    },
  });
