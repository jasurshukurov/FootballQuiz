import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { CareerClubCard } from '@/components/career/CareerClubCard';
import { CareerEntry } from '@/types/career';
import { spacing } from '@/constants/theme';

interface TimelineViewProps {
  career: CareerEntry[];
  showYears: boolean;
  isSorted: boolean;
}

function TimelineViewInner({ career, showYears, isSorted }: TimelineViewProps) {
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      {career.map((entry, index) => (
        <Animated.View
          key={`${entry.club}-${entry.from ?? index}`}
          layout={LinearTransition.duration(600)}>
          <CareerClubCard
            club={entry.club}
            from={entry.from}
            to={entry.to}
            showYears={showYears}
            index={index}
            isSorted={isSorted}
          />
        </Animated.View>
      ))}
    </ScrollView>
  );
}

export const TimelineView = React.memo(TimelineViewInner);

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingVertical: spacing.sm,
    paddingBottom: 24,
  },
});
