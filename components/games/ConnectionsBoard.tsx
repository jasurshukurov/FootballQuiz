import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import PopInView from '@/components/ui/PopInView';
import ShakeView from '@/components/ui/ShakeView';
import ConnectionsTile from '@/components/games/ConnectionsTile';
import { colors, fonts, borderRadius } from '@/constants/theme';

export interface TileData {
  name: string;
  selected: boolean;
  solved: boolean;
  solvedColor?: string;
}

export interface SolvedCategory {
  name: string;
  color: string;
  playerNames: string[];
}

interface ConnectionsBoardProps {
  tiles: TileData[];
  solvedCategories: SolvedCategory[];
  onTilePress: (name: string) => void;
  shaking: boolean;
  disabled: boolean;
}

function ConnectionsBoard({
  tiles,
  solvedCategories,
  onTilePress,
  shaking,
  disabled,
}: ConnectionsBoardProps) {
  const unsolvedTiles = tiles.filter((t) => !t.solved);

  // Build rows of 4 from unsolved tiles
  const rows: TileData[][] = [];
  for (let i = 0; i < unsolvedTiles.length; i += 4) {
    rows.push(unsolvedTiles.slice(i, i + 4));
  }

  return (
    <View style={styles.container}>
      {/* Solved categories at top */}
      {solvedCategories.map((cat, idx) => (
        <PopInView key={cat.name} delay={idx * 100}>
          <View style={[styles.solvedRow, { backgroundColor: cat.color }]}>
            <Text style={styles.solvedCategoryName}>{cat.name}</Text>
            <Text style={styles.solvedPlayerNames}>{cat.playerNames.join(', ')}</Text>
          </View>
        </PopInView>
      ))}

      {/* Unsolved tile grid */}
      <ShakeView shake={shaking}>
        {rows.map((row, rowIdx) => (
          <View key={rowIdx} style={styles.row}>
            {row.map((tile) => (
              <View key={tile.name} style={styles.tileWrapper}>
                <ConnectionsTile
                  name={tile.name}
                  selected={tile.selected}
                  solved={false}
                  onPress={() => onTilePress(tile.name)}
                  disabled={disabled || tile.solved}
                />
              </View>
            ))}
          </View>
        ))}
      </ShakeView>
    </View>
  );
}

export default React.memo(ConnectionsBoard);

const styles = StyleSheet.create({
  container: {
    gap: 10,
    paddingHorizontal: 4,
  },
  solvedRow: {
    borderRadius: borderRadius.lg,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  solvedCategoryName: {
    fontSize: 14,
    fontFamily: fonts.heading,
    color: colors.retroBlack,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  solvedPlayerNames: {
    fontSize: 11,
    fontFamily: fonts.subheading,
    color: colors.retroBlack,
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  tileWrapper: {
    flex: 1,
  },
});
