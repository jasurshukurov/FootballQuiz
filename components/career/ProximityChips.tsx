import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { spacing, borderRadius, type, motion } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';
import { ProximityChips as ProximityData } from '@/lib/careerHelpers';

interface Props {
  data: ProximityData;
}

const CHIP_ORDER: { key: keyof Omit<ProximityData, 'guessName'>; label: string }[] = [
  { key: 'nationality', label: 'Nationality' },
  { key: 'position', label: 'Position' },
  { key: 'league', label: 'League' },
  { key: 'era', label: 'Same era' },
];

/**
 * Non-spoiler feedback after a wrong guess: how the guessed player lines up with
 * the mystery player. Green chip = shared, muted chip = differs. Never names the
 * answer — it only reflects the guess.
 */
export default function ProximityChips({ data }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    // key on the guess so a new wrong guess re-runs the entrance (feedback moment)
    <Animated.View
      key={data.guessName}
      entering={FadeIn.duration(motion.base)}
      style={styles.container}>
      <Text style={styles.caption}>{data.guessName} vs the mystery player</Text>
      <View style={styles.row}>
        {CHIP_ORDER.map(({ key, label }) => {
          const match = data[key];
          return (
            <View key={key} style={[styles.chip, match ? styles.chipMatch : styles.chipMiss]}>
              <Text style={[styles.chipText, match ? styles.chipTextMatch : styles.chipTextMiss]}>
                {match ? '✓' : '✗'} {label}
              </Text>
            </View>
          );
        })}
      </View>
    </Animated.View>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: {
      gap: spacing.xs,
      alignItems: 'center',
    },
    caption: {
      ...type.micro,
      color: c.textMuted,
    },
    row: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: spacing.xs,
    },
    chip: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.full,
      borderWidth: 1,
    },
    chipMatch: {
      backgroundColor: c.accentSoft,
      borderColor: c.accentBorder,
    },
    chipMiss: {
      backgroundColor: c.bgCard,
      borderColor: c.border,
    },
    chipText: {
      ...type.micro,
    },
    chipTextMatch: {
      color: c.accentBright,
    },
    chipTextMiss: {
      color: c.textMuted,
    },
  });
