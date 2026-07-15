import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  interpolate,
  useReducedMotion,
} from 'react-native-reanimated';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import TeamCrest from '@/components/ui/TeamCrest';
import Tappable from '@/components/ui/Tappable';
import { type, spacing, borderRadius, motion } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';
import { TimelineNode as TimelineNodeType, getClubHint } from '@/lib/careerTimelineGenerator';

interface TimelineNodeProps {
  node: TimelineNodeType;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  isActive: boolean;
  onPress: () => void;
  onHintPress?: () => void;
}

export default function TimelineNode({
  node,
  isFirst,
  isLast,
  isActive,
  onPress,
  onHintPress,
}: TimelineNodeProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const pulseOpacity = useSharedValue(1);
  const flipProgress = useSharedValue(node.isGuessed ? 1 : 0);
  const reducedMotion = useReducedMotion();

  const isRevealed = !node.isHidden || node.isGuessed;
  const lineColor = isRevealed ? colors.accent : colors.textMuted;

  // Hidden-stint attention cue: breathe the "?" glyph's opacity (matches
  // JerseySlot). NOT a whole-card scale — the old 1.15 grow/shrink made every
  // hidden card, including the active one, read as "jumping". Loop gates on
  // reduced motion (falls back to a statically dimmed glyph).
  useEffect(() => {
    if (!node.isHidden || node.isGuessed) {
      pulseOpacity.value = 1;
    } else if (reducedMotion) {
      pulseOpacity.value = 0.7;
    } else {
      pulseOpacity.value = withRepeat(
        withTiming(0.4, { duration: motion.slow, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    }
  }, [node.isHidden, node.isGuessed, pulseOpacity, reducedMotion]);

  // Flip animation when guessed
  useEffect(() => {
    if (node.isGuessed) {
      flipProgress.value = withTiming(1, { duration: motion.base });
    }
  }, [node.isGuessed, flipProgress]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  const flipStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 600 },
      { rotateY: `${interpolate(flipProgress.value, [0, 1], [0, 180])}deg` },
    ],
    opacity: interpolate(flipProgress.value, [0, 0.5, 0.5, 1], [1, 1, 0, 0]),
  }));

  const revealStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 600 },
      { rotateY: `${interpolate(flipProgress.value, [0, 1], [180, 360])}deg` },
    ],
    opacity: interpolate(flipProgress.value, [0, 0.5, 0.5, 1], [0, 0, 1, 1]),
  }));

  const canPress = node.isHidden && !node.isGuessed;

  return (
    <View style={layoutStyles.container}>
      {/* Vertical line + dot */}
      <View style={layoutStyles.lineContainer}>
        {!isFirst && <View style={[layoutStyles.lineTop, { backgroundColor: lineColor }]} />}
        <View style={[styles.dot, { backgroundColor: lineColor }]} />
        {!isLast && <View style={[layoutStyles.lineBottom, { backgroundColor: lineColor }]} />}
      </View>

      {/* Content card */}
      <View style={layoutStyles.cardContainer}>
        <Text style={[styles.years, isRevealed && styles.yearsRevealed]}>
          {node.from} - {node.to}
        </Text>

        {!node.isHidden ? (
          // Always revealed node (first/last)
          <View style={[layoutStyles.card, styles.cardRevealed, isActive && styles.cardActive]}>
            <TeamCrest teamName={node.club} size={24} />
            <Text style={styles.clubName}>{node.club}</Text>
          </View>
        ) : node.isGuessed ? (
          // Was hidden, now guessed - show with flip
          <View style={layoutStyles.flipContainer}>
            <Animated.View style={[layoutStyles.card, styles.cardHidden, flipStyle]}>
              <Text style={styles.questionMark}>?</Text>
              <Text style={styles.hiddenText}>???</Text>
            </Animated.View>
            <Animated.View
              style={[layoutStyles.card, styles.cardRevealed, layoutStyles.flipBack, revealStyle]}>
              <TeamCrest teamName={node.club} size={24} />
              <Text style={styles.clubName}>{node.club}</Text>
            </Animated.View>
          </View>
        ) : (
          // Hidden node
          <View>
            <Tappable
              onPress={onPress}
              disabled={!canPress}
              hoverStyle={{ backgroundColor: colors.bgCardPressed, borderRadius: borderRadius.md }}>
              <View style={[layoutStyles.card, styles.cardHidden, isActive && styles.cardActive]}>
                <Animated.Text style={[styles.questionMark, pulseStyle]}>?</Animated.Text>
                {node.hintRevealed ? (
                  <Text style={styles.hintText}>{getClubHint(node.club)}</Text>
                ) : (
                  <Text style={styles.hiddenText}>???</Text>
                )}
              </View>
            </Tappable>
            {!node.hintRevealed && onHintPress && (
              <Tappable
                style={styles.hintButton}
                hoverStyle={{ backgroundColor: colors.bgCardPressed }}
                onPress={onHintPress}>
                <View style={layoutStyles.hintButtonInner}>
                  <FontAwesome name="lightbulb-o" size={14} color={colors.streak} />
                  <Text style={styles.hintButtonText}>Hint (−5 XP)</Text>
                </View>
              </Tappable>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

// Layout-only styles stay module-scope.
const layoutStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    minHeight: 72,
  },
  lineContainer: {
    width: 32,
    alignItems: 'center',
  },
  lineTop: {
    width: 2,
    flex: 1,
  },
  lineBottom: {
    width: 2,
    flex: 1,
  },
  cardContainer: {
    flex: 1,
    paddingLeft: spacing.sm,
    paddingVertical: spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  hintButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  flipContainer: {
    position: 'relative',
  },
  flipBack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
});

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    dot: {
      width: 12,
      height: 12,
      borderRadius: borderRadius.full,
      borderWidth: 2,
      borderColor: c.bgBase,
    },
    years: {
      ...type.micro,
      color: c.textSecondary,
      marginBottom: spacing.xs,
    },
    yearsRevealed: {
      color: c.accent,
    },
    cardRevealed: {
      backgroundColor: c.accentSoft,
      borderColor: c.accentBorder,
    },
    cardHidden: {
      backgroundColor: c.bgCard,
      borderColor: c.border,
    },
    cardActive: {
      borderColor: c.accent,
      borderWidth: 2,
    },
    clubName: {
      ...type.bodyBold,
      color: c.textPrimary,
    },
    questionMark: {
      ...type.h2,
      color: c.streak,
    },
    hiddenText: {
      ...type.caption,
      color: c.textSecondary,
    },
    hintText: {
      ...type.captionBold,
      color: c.streak,
      letterSpacing: 1,
    },
    hintButton: {
      alignSelf: 'flex-start',
      marginTop: spacing.xs,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs / 2,
      borderRadius: borderRadius.sm,
      backgroundColor: c.streakSoft,
    },
    hintButtonText: {
      ...type.captionBold,
      color: c.streak,
    },
  });
