import React, { RefObject, useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { borderRadius, motion, spacing, type } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';
import { useDailyStateStore } from '@/hooks/useDailyStateStore';
import { WEB_CONTENT_MAX_WIDTH } from '@/components/ui/Screen';
import Confetti from '@/components/ui/Confetti';
import StreakBadge from '@/components/ui/StreakBadge';
import GameOverActions from '@/components/ui/GameOverActions';
import GameOverExtras from '@/components/ui/GameOverExtras';

/** One square per guess/round in the verdict glyph row. */
export type GlyphStatus = 'correct' | 'close' | 'wrong';

interface GameOverSheetProps {
  visible: boolean;
  /** Drives the verdict color and the confetti burst. */
  win: boolean;
  /** Big condensed headline, e.g. "GOT IT IN 3" / "FULL TIME". */
  verdict: string;
  /** One line under the verdict — losses get "The answer was X", never shame. */
  subtitle?: React.ReactNode;
  /** Per-guess result squares, popped in with a stagger. */
  glyphs?: GlyphStatus[];
  shareRef: RefObject<View | null>;
  shareText: string;
  onPlayAgain?: () => void;
  playAgainLabel?: string;
  /** Tapping the scrim or the grab handle — lets the player inspect the
   *  finished board behind the sheet. Omit to make the sheet non-dismissible. */
  onDismiss?: () => void;
  /** Mode just finished — excluded from the "Next up" suggestion. */
  currentModeKey?: string;
  /** Mode-specific reveal content between the streak and the actions. */
  children?: React.ReactNode;
  /** Offscreen share-capture view (must live inside the Modal on native). */
  offscreenCapture?: React.ReactNode;
}

/**
 * The game-over bottom sheet: slides up over the finished board (scrim keeps
 * it visible), grab handle, condensed verdict, staggered glyph row, streak
 * badge, share/copy actions, and the NEXT UP + countdown flourish. Use for
 * modes whose board stays informative behind the result; reveal-heavy modes
 * keep their inline full-screen result blocks.
 */
export default function GameOverSheet({
  visible,
  win,
  verdict,
  subtitle,
  glyphs,
  shareRef,
  shareText,
  onPlayAgain,
  playAgainLabel,
  onDismiss,
  currentModeKey,
  children,
  offscreenCapture,
}: GameOverSheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const streak = useDailyStateStore((s) => s.currentStreak);

  const glyphColor: Record<GlyphStatus, string> = {
    correct: colors.accent,
    close: colors.streak,
    wrong: colors.danger,
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onDismiss ?? (() => {})}>
      <View style={styles.overlay}>
        <Animated.View entering={FadeIn.duration(motion.base)} style={StyleSheet.absoluteFill}>
          <Pressable
            style={[StyleSheet.absoluteFill, styles.scrim]}
            onPress={onDismiss}
            accessibilityLabel={onDismiss ? 'View the board' : undefined}
            disabled={!onDismiss}
          />
        </Animated.View>
        {win && <Confetti intensity="high" />}

        <Animated.View
          entering={SlideInDown.springify()
            .damping(motion.springBouncy.damping)
            .stiffness(motion.springBouncy.stiffness)}
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
          <Pressable
            onPress={onDismiss}
            disabled={!onDismiss}
            accessibilityLabel={onDismiss ? 'View the board' : undefined}
            style={styles.grabArea}>
            <View style={styles.grabHandle} />
          </Pressable>

          <ScrollView
            style={layout.scroll}
            contentContainerStyle={layout.scrollContent}
            showsVerticalScrollIndicator={false}>
            <Animated.Text
              entering={FadeInDown.delay(80).duration(motion.base)}
              style={[styles.verdict, { color: win ? colors.accentBright : colors.textPrimary }]}>
              {verdict}
            </Animated.Text>
            {subtitle != null && (
              <Animated.View entering={FadeInDown.delay(140).duration(motion.base)}>
                {typeof subtitle === 'string' ? (
                  <Text style={styles.subtitle}>{subtitle}</Text>
                ) : (
                  subtitle
                )}
              </Animated.View>
            )}

            {glyphs && glyphs.length > 0 && (
              <View style={layout.glyphRow}>
                {glyphs.map((g, i) => (
                  <Animated.View
                    key={i}
                    entering={FadeInDown.delay(180 + i * 60)
                      .springify()
                      .damping(motion.springBouncy.damping)
                      .stiffness(motion.springBouncy.stiffness)}
                    style={[styles.glyph, { backgroundColor: glyphColor[g] }]}
                  />
                ))}
              </View>
            )}

            <View style={layout.streakWrap}>
              <StreakBadge streak={streak} />
            </View>

            {children}

            <GameOverActions
              shareRef={shareRef}
              shareText={shareText}
              win={win}
              onPlayAgain={onPlayAgain}
              playAgainLabel={playAgainLabel}
              includeExtras={false}
              currentModeKey={currentModeKey}
            />
            <GameOverExtras
              win={win}
              currentModeKey={currentModeKey}
              showStreak={false}
              showConfetti={false}
            />
          </ScrollView>
        </Animated.View>

        {offscreenCapture != null && (
          <View style={layout.offscreen} pointerEvents="none">
            {offscreenCapture}
          </View>
        )}
      </View>
    </Modal>
  );
}

const layout = StyleSheet.create({
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
  },
  glyphRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  streakWrap: {
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  offscreen: {
    position: 'absolute',
    left: -9999,
  },
});

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    scrim: {
      backgroundColor: c.scrim,
    },
    sheet: {
      alignSelf: 'center',
      width: '100%',
      maxWidth: WEB_CONTENT_MAX_WIDTH,
      maxHeight: '86%',
      backgroundColor: c.bgElevated,
      borderTopLeftRadius: borderRadius.xl,
      borderTopRightRadius: borderRadius.xl,
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: c.border,
    },
    grabArea: {
      alignItems: 'center',
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
    },
    grabHandle: {
      width: 36,
      height: 4,
      borderRadius: borderRadius.full,
      backgroundColor: c.borderStrong,
    },
    verdict: {
      ...type.h1,
      textAlign: 'center',
      marginTop: spacing.xs,
    },
    subtitle: {
      ...type.body,
      color: c.textSecondary,
      textAlign: 'center',
      marginTop: spacing.sm,
    },
    glyph: {
      width: 28,
      height: 28,
      borderRadius: borderRadius.sm,
    },
  });
