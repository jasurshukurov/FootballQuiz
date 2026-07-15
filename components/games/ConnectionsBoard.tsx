import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import PopInView from '@/components/ui/PopInView';
import ShakeView from '@/components/ui/ShakeView';
import ConnectionsTile, { connectionsGroupColor } from '@/components/games/ConnectionsTile';
import { type, spacing, borderRadius, motion } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export interface TileData {
  name: string;
  selected: boolean;
  solved: boolean;
}

export interface SolvedCategory {
  name: string;
  /** Semantic group key (0 easiest .. 3 hardest) — mapped to theme-aware color. */
  difficulty: number;
  playerNames: string[];
}

interface ConnectionsBoardProps {
  tiles: TileData[];
  solvedCategories: SolvedCategory[];
  onTilePress: (name: string) => void;
  shaking: boolean;
  disabled: boolean;
}

/** Staggered entrance cap — only the first N tiles animate in. */
const MAX_ENTRANCE = 12;

function ConnectionsBoard({
  tiles,
  solvedCategories,
  onTilePress,
  shaking,
  disabled,
}: ConnectionsBoardProps) {
  const theme = useTheme();

  // Entrance animation fires only on the board's initial mount — solves and
  // shuffles re-parent tiles between rows and must NOT replay the entrance.
  const enteredRef = useRef(false);
  const animateEntrance = !enteredRef.current;
  useEffect(() => {
    enteredRef.current = true;
  }, []);

  const unsolvedTiles = tiles.filter((t) => !t.solved);

  // Build rows of 4 from unsolved tiles
  const rows: TileData[][] = [];
  for (let i = 0; i < unsolvedTiles.length; i += 4) {
    rows.push(unsolvedTiles.slice(i, i + 4));
  }

  return (
    <View style={styles.container}>
      {/* Solved categories at top */}
      {solvedCategories.map((cat, idx) => {
        const group = connectionsGroupColor(cat.difficulty, theme.dark);
        return (
          <PopInView key={cat.name} delay={idx * 100}>
            <View style={[styles.solvedRow, { backgroundColor: group.bg }]}>
              <Text style={[styles.solvedCategoryName, { color: group.text }]}>{cat.name}</Text>
              <Text style={[styles.solvedPlayerNames, { color: group.text }]}>
                {cat.playerNames.join(', ')}
              </Text>
            </View>
          </PopInView>
        );
      })}

      {/* Unsolved tile grid */}
      <ShakeView shake={shaking}>
        {/* Rows live INSIDE ShakeView, out of reach of the container's gap —
            this wrapper gives the vertical gap so both axes match. */}
        <View style={styles.rowsWrap}>
          {rows.map((row, rowIdx) => (
            <View key={rowIdx} style={styles.row}>
              {row.map((tile, colIdx) => {
                const idx = rowIdx * 4 + colIdx;
                return (
                  <Animated.View
                    key={tile.name}
                    style={styles.tileWrapper}
                    entering={
                      animateEntrance && idx < MAX_ENTRANCE
                        ? FadeIn.delay(idx * 40).duration(motion.base)
                        : undefined
                    }>
                    <ConnectionsTile
                      name={tile.name}
                      selected={tile.selected}
                      solved={false}
                      onPress={() => onTilePress(tile.name)}
                      disabled={disabled || tile.solved}
                    />
                  </Animated.View>
                );
              })}
            </View>
          ))}
        </View>
      </ShakeView>
    </View>
  );
}

export default React.memo(ConnectionsBoard);

// Layout-only + fixed-ink styles; group colors are applied inline per row.
const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  solvedRow: {
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  solvedCategoryName: {
    ...type.h3,
    textTransform: 'uppercase',
    letterSpacing: 1,
    // Archetype titles can run long ("Premier League goalkeepers") — keep
    // wrapped lines centered instead of ragged-left.
    textAlign: 'center',
  },
  solvedPlayerNames: {
    ...type.micro,
    marginTop: spacing.xs / 2,
    textAlign: 'center',
  },
  rowsWrap: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tileWrapper: {
    flex: 1,
  },
});
