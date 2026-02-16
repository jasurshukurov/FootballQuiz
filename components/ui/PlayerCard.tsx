import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { GuessResult } from '@/types/game';
import { colors, borderRadius } from '@/constants/theme';
import AttributeCell from './AttributeCell';
import PopInView from './PopInView';
import TeamCrest from './TeamCrest';

interface PlayerCardProps {
  guess: GuessResult;
}

function PlayerCard({ guess }: PlayerCardProps) {
  const { player, comparisons } = guess;

  return (
    <PopInView>
      <View style={styles.container}>
        <View style={styles.nameRow}>
          <TeamCrest teamName={player.current_team} size={20} />
          <Text style={styles.name}>{player.name}</Text>
        </View>
        <View style={styles.row}>
          <View style={styles.cell}>
            <AttributeCell
              label="Team"
              value={comparisons.team.guessValue}
              status={comparisons.team.status}
              delay={0}
            />
          </View>
          <View style={styles.cell}>
            <AttributeCell
              label="League"
              value={comparisons.league.guessValue}
              status={comparisons.league.status}
              delay={100}
            />
          </View>
          <View style={styles.cell}>
            <AttributeCell
              label="Nat"
              value={comparisons.nationality.guessValue}
              status={comparisons.nationality.status}
              delay={200}
            />
          </View>
          <View style={styles.cell}>
            <AttributeCell
              label="Pos"
              value={comparisons.position.guessValue}
              status={comparisons.position.status}
              delay={300}
            />
          </View>
          <View style={styles.cell}>
            <AttributeCell
              label="Value"
              value={comparisons.marketValue.guessValue}
              status={comparisons.marketValue.status}
              delay={400}
            />
          </View>
        </View>
      </View>
    </PopInView>
  );
}

export default React.memo(PlayerCard);

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
    padding: 12,
    backgroundColor: 'rgba(17,17,40,0.7)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  nameRow: {
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: 14,
    fontFamily: 'BarlowCondensed-Bold',
    color: colors.chalkWhite,
  },
  row: {
    flexDirection: 'row',
    gap: 4,
  },
  cell: {
    flex: 1,
  },
});
