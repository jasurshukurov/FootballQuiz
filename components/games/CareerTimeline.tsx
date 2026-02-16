import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import TimelineNodeComponent from '@/components/games/TimelineNode';
import { TimelineNode } from '@/lib/careerTimelineGenerator';
import { spacing } from '@/constants/theme';

interface CareerTimelineProps {
  nodes: TimelineNode[];
  activeNodeIndex: number | null;
  onNodePress: (index: number) => void;
  onHintPress?: (index: number) => void;
}

export default function CareerTimeline({
  nodes,
  activeNodeIndex,
  onNodePress,
  onHintPress,
}: CareerTimelineProps) {
  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
      {nodes.map((node, index) => (
        <TimelineNodeComponent
          key={`${index}-${node.club}`}
          node={node}
          index={index}
          isFirst={index === 0}
          isLast={index === nodes.length - 1}
          isActive={activeNodeIndex === index}
          onPress={() => onNodePress(index)}
          onHintPress={onHintPress ? () => onHintPress(index) : undefined}
        />
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
