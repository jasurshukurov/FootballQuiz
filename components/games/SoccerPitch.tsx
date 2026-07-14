import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';

import JerseySlot from './JerseySlot';
import { Match } from '@/types/match';
import { getTeamColors } from '@/data/teamColors';
import { spacing, borderRadius } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';

interface SoccerPitchProps {
  match: Match;
  teamSide: 'a' | 'b';
  revealedSlots: Set<number>;
  shakingSlot: number | null;
  onSlotPress: (index: number) => void;
}

// 4-4-2 formation positions by row (top = strikers, bottom = GK)
const FORMATION_ROWS = [
  { positions: ['ST', 'ST'], indices: [9, 10] },
  { positions: ['LM', 'CM', 'CM', 'RM'], indices: [5, 6, 7, 8] },
  { positions: ['LB', 'CB', 'CB', 'RB'], indices: [1, 2, 3, 4] },
  { positions: ['GK'], indices: [0] },
];

export default function SoccerPitch({
  match,
  teamSide,
  revealedSlots,
  shakingSlot,
  onSlotPress,
}: SoccerPitchProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const teamName = teamSide === 'a' ? match.opponent_a : match.opponent_b;
  const lineupNames = teamSide === 'a' ? match.lineup_a_names : match.lineup_b_names;
  const teamColor = getTeamColors(teamName);

  return (
    <View style={styles.pitch}>
      {/* Mowing stripes — faint green bands for a floodlit night pitch */}
      {Array.from({ length: 8 }).map((_, i) => (
        <View
          key={i}
          style={[
            layoutStyles.mowStripe,
            {
              top: `${i * 12.5}%`,
              height: '12.5%',
              backgroundColor: i % 2 === 0 ? colors.accentSoft : 'transparent',
            },
          ]}
        />
      ))}

      {/* Center circle */}
      <View style={styles.centerCircle} />
      {/* Center line */}
      <View style={styles.centerLine} />
      {/* Top penalty box */}
      <View style={styles.penaltyBoxTop} />
      {/* Bottom penalty box */}
      <View style={styles.penaltyBoxBottom} />

      {/* Formation rows */}
      <View style={layoutStyles.formationContainer}>
        {FORMATION_ROWS.map((row, rowIdx) => (
          <View key={rowIdx} style={layoutStyles.formationRow}>
            {row.indices.map((playerIdx, i) => (
              <JerseySlot
                key={playerIdx}
                playerName={lineupNames[playerIdx]}
                revealed={revealedSlots.has(playerIdx)}
                shaking={shakingSlot === playerIdx}
                position={row.positions[i]}
                jerseyColor={teamColor.primary}
                onPress={() => onSlotPress(playerIdx)}
              />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

// Layout-only styles stay module-scope.
const layoutStyles = StyleSheet.create({
  mowStripe: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 0,
  },
  formationContainer: {
    flex: 1,
    justifyContent: 'space-evenly',
    paddingVertical: spacing.lg,
    zIndex: 3,
  },
  formationRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },
});

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    pitch: {
      width: '100%',
      aspectRatio: 0.7,
      backgroundColor: c.bgElevated,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: c.borderStrong,
      overflow: 'hidden',
      position: 'relative',
    },
    centerLine: {
      position: 'absolute',
      top: '50%',
      left: 0,
      right: 0,
      height: 1,
      backgroundColor: c.borderStrong,
      zIndex: 2,
    },
    centerCircle: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      width: 80,
      height: 80,
      marginLeft: -40,
      marginTop: -40,
      borderRadius: borderRadius.full,
      borderWidth: 1,
      borderColor: c.borderStrong,
      zIndex: 2,
    },
    penaltyBoxTop: {
      position: 'absolute',
      top: 0,
      left: '25%',
      width: '50%',
      height: '14%',
      borderWidth: 1,
      borderTopWidth: 0,
      borderColor: c.borderStrong,
      zIndex: 2,
    },
    penaltyBoxBottom: {
      position: 'absolute',
      bottom: 0,
      left: '25%',
      width: '50%',
      height: '14%',
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: c.borderStrong,
      zIndex: 2,
    },
  });
