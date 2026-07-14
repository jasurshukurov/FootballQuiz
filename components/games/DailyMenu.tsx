import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Clipboard from 'expo-clipboard';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter, type Href } from 'expo-router';

import GlassCard from '@/components/ui/GlassCard';
import Confetti from '@/components/ui/Confetti';
import NextPuzzleCountdown from '@/components/ui/NextPuzzleCountdown';
import RetroButton from '@/components/ui/RetroButton';
import Tappable from '@/components/ui/Tappable';
import { useDailyProgressStore } from '@/hooks/useDailyProgressStore';
import { useDailyStateStore } from '@/hooks/useDailyStateStore';
import { useDisabledModes } from '@/hooks/useRemoteConfigStore';
import { type, spacing, borderRadius, touch, motion } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';
import { GAME_MODES } from '@/lib/modeRegistry';
import { getDailyNumber } from '@/lib/dailyPuzzle';
import { buildDailyRecapText } from '@/lib/sharing';
import { playCheer } from '@/lib/sounds';

/** Staggered entrance cap — only the first N mode rows animate in. */
const MAX_ENTRANCE = 12;

export default function DailyMenu() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { completedModes, scoresByMode, checkAndResetForNewDay, getCompletedCount, getTotalModes } =
    useDailyProgressStore();
  const recordPerfectDay = useDailyProgressStore((s) => s.recordPerfectDay);
  const dailyStreak = useDailyStateStore((s) => s.currentStreak);
  const disabledModes = useDisabledModes();

  const [showConfetti, setShowConfetti] = useState(false);

  // Tap haptic fires inside RetroButton — no extra impact here.
  const handleShareDay = useCallback(async () => {
    const text = buildDailyRecapText({
      dailyNumber: getDailyNumber(),
      dailyStreak,
      totalModes: getTotalModes(),
      completedModes,
      scoresByMode,
    });
    try {
      // Copy as a fallback so the caption is available even if the OS share
      // sheet strips it; then open the native text share sheet.
      await Clipboard.setStringAsync(text);
    } catch {
      // best-effort
    }
    await Share.share({ message: text });
  }, [dailyStreak, getTotalModes, completedModes, scoresByMode]);

  useEffect(() => {
    checkAndResetForNewDay();
  }, [checkAndResetForNewDay]);

  const completedCount = getCompletedCount();
  const totalModes = getTotalModes();
  const progressPercent = totalModes > 0 ? (completedCount / totalModes) * 100 : 0;
  const isPerfect = completedCount > 0 && completedCount === totalModes;

  useEffect(() => {
    if (!isPerfect) return;
    // recordPerfectDay is date-guarded and returns true only the first time it
    // counts today, so the celebration fires exactly once per perfect day.
    if (!recordPerfectDay()) return;
    playCheer();
    setShowConfetti(true);
    const timer = setTimeout(() => setShowConfetti(false), 4000);
    return () => clearTimeout(timer);
  }, [isPerfect, recordPerfectDay]);

  return (
    <GlassCard style={layoutStyles.container}>
      {showConfetti && <Confetti />}
      <View style={layoutStyles.inner}>
        <Text style={styles.title}>TODAY&apos;S CHALLENGES</Text>

        {isPerfect && (
          <View style={styles.perfectBanner}>
            <Text style={styles.perfectText}>PERFECT DAY!</Text>
            <NextPuzzleCountdown />
            <View style={layoutStyles.shareDayButton}>
              <RetroButton title="Share your day" onPress={handleShareDay} />
            </View>
          </View>
        )}

        {/* Progress summary */}
        <View style={layoutStyles.progressRow}>
          <Text style={styles.progressText}>
            {completedCount}/{totalModes} played
          </Text>
        </View>

        {/* Progress bar */}
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
        </View>

        {/* Mode rows */}
        <View style={layoutStyles.modeList}>
          {GAME_MODES.map((mode, i) => {
            const done = !!completedModes[mode.key];
            const score = scoresByMode[mode.key];
            const disabled = disabledModes.includes(mode.key);

            return (
              <Animated.View
                key={mode.key}
                entering={
                  i < MAX_ENTRANCE ? FadeInDown.delay(i * 40).duration(motion.base) : undefined
                }>
                <Tappable
                  style={[layoutStyles.modeRow, disabled && layoutStyles.modeRowDisabled]}
                  hoverStyle={{ backgroundColor: colors.bgCardPressed }}
                  disabled={disabled}
                  onPress={() => {
                    if (disabled) return;
                    router.navigate(mode.route as Href);
                  }}>
                  <View style={[styles.iconWrap, done && !disabled && styles.iconWrapDone]}>
                    <FontAwesome
                      name={mode.icon}
                      size={16}
                      color={done && !disabled ? colors.accent : colors.textSecondary}
                    />
                  </View>
                  <View style={layoutStyles.modeTextWrap}>
                    <Text
                      style={[styles.modeLabel, done && styles.modeLabelDone]}
                      numberOfLines={1}>
                      {mode.title}
                    </Text>
                    <Text style={styles.modeTease} numberOfLines={1}>
                      {disabled ? 'Temporarily unavailable' : mode.tease}
                    </Text>
                  </View>
                  {!disabled &&
                    (done ? (
                      <View style={layoutStyles.doneIndicator}>
                        {score !== undefined && <Text style={styles.scoreText}>{score}</Text>}
                        <FontAwesome name="check-circle" size={18} color={colors.accent} />
                      </View>
                    ) : (
                      <FontAwesome name="chevron-right" size={14} color={colors.textMuted} />
                    ))}
                </Tappable>
              </Animated.View>
            );
          })}
        </View>
      </View>
    </GlassCard>
  );
}

// Layout-only styles stay module-scope.
const layoutStyles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  inner: {
    padding: spacing.lg,
  },
  shareDayButton: {
    marginTop: spacing.xs,
    minWidth: 200,
  },
  progressRow: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  modeList: {
    gap: spacing.xs / 2,
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: touch.min,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
  },
  modeRowDisabled: {
    opacity: 0.4,
  },
  modeTextWrap: {
    flex: 1,
    marginLeft: spacing.md,
  },
  doneIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    title: {
      ...type.h2,
      color: c.accent,
      letterSpacing: 2,
      textAlign: 'center',
      marginBottom: spacing.md,
    },
    perfectBanner: {
      alignItems: 'center',
      gap: spacing.sm - 2,
      marginBottom: spacing.md,
      paddingVertical: spacing.md - 2,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: c.accentBorder,
      backgroundColor: c.accentSoft,
    },
    perfectText: {
      ...type.h1,
      color: c.accent,
      letterSpacing: 3,
    },
    progressText: {
      ...type.captionBold,
      color: c.textPrimary,
      letterSpacing: 1,
    },
    progressBarBg: {
      height: 6,
      borderRadius: borderRadius.full,
      backgroundColor: c.bgCard,
      marginBottom: spacing.lg,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      borderRadius: borderRadius.full,
      backgroundColor: c.accent,
    },
    iconWrap: {
      width: 32,
      height: 32,
      borderRadius: borderRadius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.bgCard,
    },
    iconWrapDone: {
      backgroundColor: c.accentSoft,
    },
    modeLabel: {
      ...type.bodyBold,
      color: c.textPrimary,
    },
    modeLabelDone: {
      color: c.textSecondary,
    },
    modeTease: {
      ...type.caption,
      color: c.textMuted,
    },
    scoreText: {
      ...type.score,
      color: c.accent,
    },
  });
