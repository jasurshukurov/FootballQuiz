import React, { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import GlassCard from '@/components/ui/GlassCard';
import RetroButton from '@/components/ui/RetroButton';
import { getHowToPlay } from '@/lib/howToPlay';
import { GAME_MODES, ENDLESS_MODE } from '@/lib/modeRegistry';
import { borderRadius, motion, spacing, type } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';

interface HowToPlaySheetProps {
  /** Mode registry key — resolves title/icon (registry) + rules (lib/howToPlay). */
  modeKey: string;
  visible: boolean;
  onClose: () => void;
}

/**
 * "How to play" rules sheet. Opened from the "?" button in ScreenHeader and
 * auto-shown once on a mode's first-ever visit (persisted in useTutorialStore).
 * Fade-only entrance per the app's motion policy; dismissible via CTA,
 * backdrop press, and Escape/back (Modal onRequestClose).
 */
export default function HowToPlaySheet({ modeKey, visible, onClose }: HowToPlaySheetProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const content = getHowToPlay(modeKey);
  // The endless mode (Career Path) lives outside the daily GAME_MODES list
  // but still has rules to show.
  const mode =
    GAME_MODES.find((m) => m.key === modeKey) ??
    (ENDLESS_MODE.key === modeKey ? ENDLESS_MODE : undefined);
  if (!content || !mode) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* Backdrop press dismisses. Deliberately NOT accessibilityRole="button":
          on RN-web that renders a <button>, and the card's buttons nested
          inside would be invalid HTML (hydration error). The CTA + Escape/back
          remain the accessible dismissal paths. */}
      <Pressable style={styles.overlay} onPress={onClose} accessible={false}>
        {/* No-op pressable so taps inside the card don't hit the backdrop. */}
        <Pressable style={layout.cardWrap} onPress={() => {}} accessible={false}>
          <Animated.View entering={FadeIn.duration(motion.base)} testID="how-to-play-sheet">
            <GlassCard style={layout.card} intensity={60}>
              <View style={layout.header}>
                <View style={styles.iconCircle}>
                  <FontAwesome name={mode.icon} size={20} color={colors.accent} />
                </View>
                <View style={layout.headerText}>
                  <Text style={styles.eyebrow}>HOW TO PLAY</Text>
                  <Text style={styles.title}>{(content.title ?? mode.title).toUpperCase()}</Text>
                </View>
              </View>

              <View style={layout.steps}>
                {content.steps.map((step, i) => (
                  <View key={i} style={layout.stepRow}>
                    <View style={styles.stepBadge}>
                      <Text style={styles.stepNumber}>{i + 1}</Text>
                    </View>
                    <Text style={styles.stepText}>{step}</Text>
                  </View>
                ))}
              </View>

              {content.footer ? (
                <View style={styles.footerBox}>
                  <Text style={styles.footerText}>{content.footer}</Text>
                </View>
              ) : null}

              <RetroButton title="LET'S PLAY" onPress={onClose} />
            </GlassCard>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const layout = StyleSheet.create({
  cardWrap: {
    width: '100%',
    maxWidth: 384,
  },
  card: {
    width: '100%',
    padding: spacing.xl,
    gap: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  steps: {
    gap: spacing.md,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
});

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.scrim,
      paddingHorizontal: spacing.xl,
    },
    iconCircle: {
      width: 44,
      height: 44,
      borderRadius: borderRadius.full,
      backgroundColor: c.accentSoft,
      borderWidth: 1,
      borderColor: c.accentBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    eyebrow: {
      ...type.micro,
      color: c.accent,
      letterSpacing: 1.5,
      marginBottom: 2,
    },
    title: {
      ...type.h2,
      color: c.textPrimary,
    },
    stepBadge: {
      width: 22,
      height: 22,
      borderRadius: borderRadius.full,
      backgroundColor: c.accentSoft,
      borderWidth: 1,
      borderColor: c.accentBorder,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 1,
    },
    stepNumber: {
      ...type.micro,
      color: c.accent,
    },
    stepText: {
      ...type.body,
      color: c.textPrimary,
      flex: 1,
    },
    footerBox: {
      backgroundColor: c.accentSoft,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: c.accentBorder,
      padding: spacing.md,
    },
    footerText: {
      ...type.caption,
      color: c.textSecondary,
    },
  });
