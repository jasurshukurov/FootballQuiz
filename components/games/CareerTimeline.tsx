import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import TimelineNodeComponent from '@/components/games/TimelineNode';
import { TimelineNode } from '@/lib/careerTimelineGenerator';
import { spacing, motion } from '@/constants/theme';

interface CareerTimelineProps {
  nodes: TimelineNode[];
  activeNodeIndex: number | null;
  onNodePress: (index: number) => void;
  onHintPress?: (index: number) => void;
}

/** Staggered entrance cap — only the first N nodes animate in. */
const MAX_ENTRANCE = 12;

export default function CareerTimeline({
  nodes,
  activeNodeIndex,
  onNodePress,
  onHintPress,
}: CareerTimelineProps) {
  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
      {nodes.map((node, index) => (
        // Stable key: keying on node.club remounted the row on every reveal,
        // replaying the entrance mid-game ("jumping"). Opacity-only entrance.
        <Animated.View
          key={index}
          entering={
            index < MAX_ENTRANCE ? FadeIn.delay(index * 40).duration(motion.base) : undefined
          }>
          <TimelineNodeComponent
            node={node}
            index={index}
            isFirst={index === 0}
            isLast={index === nodes.length - 1}
            isActive={activeNodeIndex === index}
            onPress={() => onNodePress(index)}
            onHintPress={onHintPress ? () => onHintPress(index) : undefined}
          />
        </Animated.View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    paddingVertical: spacing.md,
  },
});
