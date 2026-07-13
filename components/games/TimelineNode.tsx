import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  interpolate,
} from 'react-native-reanimated';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import TeamCrest from '@/components/ui/TeamCrest';
import { colors, fonts, spacing, borderRadius } from '@/constants/theme';
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
  const pulseScale = useSharedValue(1);
  const flipProgress = useSharedValue(node.isGuessed ? 1 : 0);

  const isRevealed = !node.isHidden || node.isGuessed;
  const lineColor = isRevealed ? colors.pitchGreen : colors.steelGray;

  // Pulse animation for hidden nodes
  useEffect(() => {
    if (node.isHidden && !node.isGuessed) {
      pulseScale.value = withRepeat(withTiming(1.15, { duration: 800 }), -1, true);
    }
  }, [node.isHidden, node.isGuessed, pulseScale]);

  // Flip animation when guessed
  useEffect(() => {
    if (node.isGuessed) {
      flipProgress.value = withTiming(1, { duration: 400 });
    }
  }, [node.isGuessed, flipProgress]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
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
    <View style={styles.container}>
      {/* Vertical line + dot */}
      <View style={styles.lineContainer}>
        {!isFirst && <View style={[styles.lineTop, { backgroundColor: lineColor }]} />}
        <View style={[styles.dot, { backgroundColor: lineColor }]} />
        {!isLast && <View style={[styles.lineBottom, { backgroundColor: lineColor }]} />}
      </View>

      {/* Content card */}
      <View style={styles.cardContainer}>
        <Text style={[styles.years, isRevealed && styles.yearsRevealed]}>
          {node.from} - {node.to}
        </Text>

        {!node.isHidden ? (
          // Always revealed node (first/last)
          <View style={[styles.card, styles.cardRevealed, isActive && styles.cardActive]}>
            <TeamCrest teamName={node.club} size={24} />
            <Text style={styles.clubName}>{node.club}</Text>
          </View>
        ) : node.isGuessed ? (
          // Was hidden, now guessed - show with flip
          <View style={styles.flipContainer}>
            <Animated.View style={[styles.card, styles.cardHidden, flipStyle]}>
              <Text style={styles.questionMark}>?</Text>
              <Text style={styles.hiddenText}>???</Text>
            </Animated.View>
            <Animated.View style={[styles.card, styles.cardRevealed, styles.flipBack, revealStyle]}>
              <TeamCrest teamName={node.club} size={24} />
              <Text style={styles.clubName}>{node.club}</Text>
            </Animated.View>
          </View>
        ) : (
          // Hidden node
          <View>
            <Pressable onPress={canPress ? onPress : undefined}>
              <Animated.View
                style={[styles.card, styles.cardHidden, isActive && styles.cardActive, pulseStyle]}>
                <Text style={styles.questionMark}>?</Text>
                {node.hintRevealed ? (
                  <Text style={styles.hintText}>{getClubHint(node.club)}</Text>
                ) : (
                  <Text style={styles.hiddenText}>???</Text>
                )}
              </Animated.View>
            </Pressable>
            {!node.hintRevealed && onHintPress && (
              <Pressable style={styles.hintButton} onPress={onHintPress} hitSlop={8}>
                <FontAwesome name="lightbulb-o" size={14} color={colors.cardYellow} />
                <Text style={styles.hintButtonText}>Hint (−5 XP)</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.retroBlack,
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
  years: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.steelGray,
    marginBottom: 4,
  },
  yearsRevealed: {
    color: colors.pitchGreen,
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
  cardRevealed: {
    backgroundColor: 'rgba(5,242,108,0.08)',
    borderColor: 'rgba(5,242,108,0.25)',
  },
  cardHidden: {
    backgroundColor: 'rgba(108,117,125,0.15)',
    borderColor: 'rgba(108,117,125,0.3)',
  },
  cardActive: {
    borderColor: colors.pitchGreen,
    borderWidth: 2,
  },
  clubName: {
    fontFamily: fonts.subheading,
    fontSize: 15,
    color: colors.chalkWhite,
  },
  questionMark: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.cardYellow,
  },
  hiddenText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.steelGray,
  },
  hintText: {
    fontFamily: fonts.scoreboard,
    fontSize: 13,
    color: colors.cardYellow,
    letterSpacing: 1,
  },
  hintButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    marginTop: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(244,162,97,0.12)',
  },
  hintButtonText: {
    fontFamily: fonts.subheading,
    fontSize: 12,
    color: colors.cardYellow,
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
