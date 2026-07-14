import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { spacing, borderRadius, type } from '@/constants/theme';
import { DifficultyTier, TIER_LABELS, TIER_COLORS } from '@/types/career';

interface TierBadgeProps {
  tier: DifficultyTier;
}

function TierBadgeInner({ tier }: TierBadgeProps) {
  const color = TIER_COLORS[tier];

  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.label, { color }]}>{TIER_LABELS[tier]}</Text>
    </View>
  );
}

export const TierBadge = React.memo(TierBadgeInner);

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  label: {
    ...type.captionBold,
  },
});
