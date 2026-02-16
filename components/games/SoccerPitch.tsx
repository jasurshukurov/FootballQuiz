import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import JerseySlot from './JerseySlot';
import { Match } from '@/types/match';
import { getTeamColors } from '@/data/teamColors';
import { colors } from '@/constants/theme';

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
  const teamName = teamSide === 'a' ? match.opponent_a : match.opponent_b;
  const lineupNames = teamSide === 'a' ? match.lineup_a_names : match.lineup_b_names;
  const teamColor = getTeamColors(teamName);

  return (
    <View style={styles.pitch}>
      {/* Mowing stripes */}
      {Array.from({ length: 8 }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.mowStripe,
            {
              top: `${i * 12.5}%`,
              height: '12.5%',
              backgroundColor: i % 2 === 0 ? '#3D8B37' : '#357A30',
            },
          ]}
        />
      ))}

      {/* Vignette edges */}
      <LinearGradient colors={['rgba(0,0,0,0.4)', 'transparent']} style={styles.vignetteTop} />
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.4)']} style={styles.vignetteBottom} />
      <LinearGradient
        colors={['rgba(0,0,0,0.4)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.vignetteLeft}
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.4)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.vignetteRight}
      />

      {/* Center circle */}
      <View style={styles.centerCircle} />
      {/* Center line */}
      <View style={styles.centerLine} />
      {/* Top penalty box */}
      <View style={styles.penaltyBoxTop} />
      {/* Bottom penalty box */}
      <View style={styles.penaltyBoxBottom} />

      {/* Formation rows */}
      <View style={styles.formationContainer}>
        {FORMATION_ROWS.map((row, rowIdx) => (
          <View key={rowIdx} style={styles.formationRow}>
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

const styles = StyleSheet.create({
  pitch: {
    width: '100%',
    aspectRatio: 0.7,
    backgroundColor: colors.matchGreen,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
    overflow: 'hidden',
    position: 'relative',
  },
  mowStripe: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 0,
  },
  vignetteTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '30%',
    zIndex: 1,
  },
  vignetteBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '30%',
    zIndex: 1,
  },
  vignetteLeft: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: '15%',
    zIndex: 1,
  },
  vignetteRight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: '15%',
    zIndex: 1,
  },
  centerLine: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.4)',
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
    borderRadius: 40,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
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
    borderColor: 'rgba(255,255,255,0.4)',
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
    borderColor: 'rgba(255,255,255,0.4)',
    zIndex: 2,
  },
  formationContainer: {
    flex: 1,
    justifyContent: 'space-evenly',
    paddingVertical: 16,
    zIndex: 3,
  },
  formationRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },
});
