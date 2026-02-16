import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { getAllPlayers } from '@/lib/playerData';
import { generateValidGrid, hashDateSeed } from '@/lib/gridGenerator';
import { Grid } from '@/types/grid';
import { Player } from '@/types/player';
import { colors } from '@/constants/theme';
import { useDailyProgressStore } from '@/hooks/useDailyProgressStore';
import GridCell from '@/components/ui/GridCell';
import PlayerSearchAutocomplete from '@/components/ui/PlayerSearchAutocomplete';
import RetroButton from '@/components/ui/RetroButton';
import ShareableGridResult from '@/components/ShareableGridResult';
import { captureAndShare } from '@/lib/sharing';
import { useManagerStore } from '@/hooks/useManagerStore';
import { playCheer } from '@/lib/sounds';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type CellState = 'empty' | 'selected' | 'correct' | 'wrong';

function SkeletonPulse({ style }: { style: ViewStyle }) {
  const animStyle = useAnimatedStyle(() => ({
    opacity: withRepeat(
      withSequence(withTiming(0.3, { duration: 800 }), withTiming(0.7, { duration: 800 })),
      -1,
      true,
    ),
  }));
  return <Animated.View style={[style, animStyle]} />;
}

function SkeletonGrid() {
  return (
    <LinearGradient
      colors={['#0D1B2A', '#1B0A2E']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}>
      <SafeAreaView style={styles.loadingContainer} edges={['bottom']}>
        <View style={styles.container}>
          {/* Score bar placeholder */}
          <View style={styles.scoreRow}>
            <SkeletonPulse style={styles.skeletonScoreBar} />
            <SkeletonPulse style={styles.skeletonGuessesBar} />
          </View>

          {/* Column header placeholders */}
          <View style={styles.columnHeaders}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={styles.columnHeaderCell}>
                <SkeletonPulse style={styles.skeletonColumnHeader} />
              </View>
            ))}
          </View>

          {/* 3 rows x 3 cells */}
          {[0, 1, 2].map((rowIdx) => (
            <View key={rowIdx} style={styles.gridRow}>
              <View style={styles.rowLabel}>
                <SkeletonPulse style={styles.skeletonRowLabel} />
              </View>
              {[0, 1, 2].map((colIdx) => (
                <SkeletonPulse key={colIdx} style={styles.skeletonCell} />
              ))}
            </View>
          ))}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

export default function ExploreScreen() {
  const [grid, setGrid] = useState<Grid | null>(null);
  const [cellStates, setCellStates] = useState<CellState[][]>([]);
  const [cellPlayers, setCellPlayers] = useState<(string | undefined)[][]>([]);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [score, setScore] = useState(0);
  const [guessesLeft, setGuessesLeft] = useState(9);
  const [hintsRemaining, setHintsRemaining] = useState(3);
  const [hintPlayer, setHintPlayer] = useState<string | null>(null);
  const [gridSeed, setGridSeed] = useState(() => hashDateSeed(new Date().toISOString().split('T')[0]));
  const shareRef = useRef<View>(null);

  useEffect(() => {
    const players = getAllPlayers();
    const dailyGrid = generateValidGrid(players, gridSeed);
    if (dailyGrid) {
      setGrid(dailyGrid);
      setCellStates(Array.from({ length: 3 }, () => Array<CellState>(3).fill('empty')));
      setCellPlayers(Array.from({ length: 3 }, () => Array<string | undefined>(3).fill(undefined)));
    }
  }, [gridSeed]);

  const allPlayers = useMemo(() => getAllPlayers(), []);

  const handleCellPress = useCallback((row: number, col: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedCell({ row, col });
    setHintPlayer(null);
  }, []);

  const handleSelectPlayer = useCallback(
    (player: Player) => {
      if (!selectedCell || !grid) return;

      const { row, col } = selectedCell;
      const cell = grid.cells[row][col];
      const isCorrect = cell.validPlayers.some((p) => p.id === player.id);

      setCellStates((prev) => {
        const next = prev.map((r) => [...r]);
        next[row][col] = isCorrect ? 'correct' : 'wrong';
        return next;
      });
      setCellPlayers((prev) => {
        const next = prev.map((r) => [...r]);
        next[row][col] = player.name;
        return next;
      });

      if (isCorrect) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const newScore = score + 1;
        setScore(newScore);
        useManagerStore.getState().addXp('grid', 15);
        if (newScore === 9) {
          playCheer();
        }
        if (newScore === 9 || guessesLeft - 1 <= 0) {
          useDailyProgressStore.getState().markCompleted('grid', newScore);
        }
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        if (guessesLeft - 1 <= 0) {
          useDailyProgressStore.getState().markCompleted('grid', score);
        }
      }
      setGuessesLeft((g) => g - 1);
      setHintPlayer(null);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setSelectedCell(null);
    },
    [selectedCell, grid],
  );

  const handleHint = useCallback(() => {
    if (!selectedCell || !grid || hintsRemaining <= 0) return;
    const { row, col } = selectedCell;
    const validPlayers = grid.cells[row][col].validPlayers;
    if (validPlayers.length === 0) return;
    // Pick the first valid player (shortest name tends to be most recognizable)
    const sorted = [...validPlayers].sort((a, b) => a.name.length - b.name.length);
    setHintPlayer(sorted[0].name);
    setHintsRemaining((h) => h - 1);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [selectedCell, grid, hintsRemaining]);

  const handleNewGame = useCallback(() => {
    const newSeed = Date.now();
    setGridSeed(newSeed);
    setScore(0);
    setGuessesLeft(9);
    setSelectedCell(null);
    setHintsRemaining(3);
    setHintPlayer(null);
  }, []);

  if (!grid) {
    return <SkeletonGrid />;
  }

  return (
    <LinearGradient
      colors={['#0D1B2A', '#1B0A2E']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.container}>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreText}>Score: {score}/9</Text>
            <Text style={styles.guessesLeftText}>Guesses left: {guessesLeft}</Text>
          </View>

          {/* Column headers */}
          <View style={styles.columnHeaders}>
            {grid.xCriteria.map((c, i) => (
              <View key={i} style={styles.columnHeaderCell}>
                <Text style={styles.criteriaText} numberOfLines={2}>
                  {c.label}
                </Text>
              </View>
            ))}
          </View>

          {/* Grid rows */}
          {grid.cells.map((row, rowIdx) => (
            <View key={rowIdx} style={styles.gridRow}>
              <View style={styles.rowLabel}>
                <Text style={styles.criteriaText} numberOfLines={2}>
                  {grid.yCriteria[rowIdx].label}
                </Text>
              </View>
              {row.map((_, colIdx) => (
                <GridCell
                  key={colIdx}
                  state={
                    selectedCell?.row === rowIdx && selectedCell?.col === colIdx
                      ? 'selected'
                      : (cellStates[rowIdx]?.[colIdx] ?? 'empty')
                  }
                  playerName={cellPlayers[rowIdx]?.[colIdx]}
                  onPress={() => handleCellPress(rowIdx, colIdx)}
                  disabled={
                    guessesLeft <= 0 ||
                    cellStates[rowIdx]?.[colIdx] === 'correct' ||
                    cellStates[rowIdx]?.[colIdx] === 'wrong'
                  }
                />
              ))}
            </View>
          ))}

          {/* Share and Play Again buttons when game is over */}
          {(guessesLeft <= 0 || score === 9) && (
            <View style={styles.gameOverButtons}>
              <RetroButton title="Share Result" onPress={() => captureAndShare(shareRef)} />
              <RetroButton title="Play Again" onPress={handleNewGame} variant="primary" />
            </View>
          )}

          {/* Search when cell selected */}
          {selectedCell && guessesLeft > 0 && (
            <View style={styles.searchSection}>
              <Text style={styles.findLabel}>
                Find: {grid.yCriteria[selectedCell.row].label} +{' '}
                {grid.xCriteria[selectedCell.col].label}
              </Text>
              <PlayerSearchAutocomplete
                players={allPlayers}
                onSelectPlayer={handleSelectPlayer}
                placeholder="Search player..."
              />
              <View style={styles.hintRow}>
                <Pressable
                  onPress={handleHint}
                  disabled={hintsRemaining <= 0}
                  style={[styles.hintButton, hintsRemaining <= 0 && styles.hintButtonDisabled]}>
                  <FontAwesome name="lightbulb-o" size={14} color={hintsRemaining > 0 ? '#F4A261' : '#6C757D'} />
                  <Text style={[styles.hintButtonText, hintsRemaining <= 0 && { color: '#6C757D' }]}>
                    Hint ({hintsRemaining}/3)
                  </Text>
                </Pressable>
                {hintPlayer && (
                  <Text style={styles.hintSuggestion}>Try: {hintPlayer}</Text>
                )}
              </View>
            </View>
          )}
          {/* Offscreen shareable view */}
          <View style={styles.offscreen}>
            <View ref={shareRef} collapsable={false}>
              <ShareableGridResult cellStates={cellStates} score={score} />
            </View>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skeletonScoreBar: {
    width: 80,
    height: 14,
    borderRadius: 4,
    backgroundColor: colors.pitchGreen,
  },
  skeletonGuessesBar: {
    width: 100,
    height: 12,
    borderRadius: 4,
    backgroundColor: colors.steelGray,
  },
  skeletonColumnHeader: {
    width: '60%',
    height: 10,
    borderRadius: 4,
    backgroundColor: colors.pitchGreen,
  },
  skeletonRowLabel: {
    width: '70%',
    height: 10,
    borderRadius: 4,
    backgroundColor: colors.pitchGreen,
  },
  skeletonCell: {
    flex: 1,
    height: 60,
    borderRadius: 6,
    backgroundColor: 'rgba(5, 242, 108, 0.15)',
  },
  scoreRow: {
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scoreText: {
    fontSize: 14,
    fontFamily: 'SpaceMono-Bold',
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: '#05F26C',
  },
  guessesLeftText: {
    fontSize: 12,
    fontFamily: 'SpaceMono-Bold',
    color: '#6C757D',
  },
  columnHeaders: {
    marginBottom: 4,
    flexDirection: 'row',
    gap: 4,
    paddingLeft: 80,
  },
  columnHeaderCell: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 6,
    backgroundColor: 'rgba(17,17,40,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingVertical: 4,
  },
  criteriaText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.pitchGreen,
  },
  gridRow: {
    marginBottom: 4,
    flexDirection: 'row',
    gap: 4,
  },
  rowLabel: {
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    backgroundColor: 'rgba(17,17,40,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  searchSection: {
    marginTop: 16,
  },
  findLabel: {
    marginBottom: 8,
    fontSize: 12,
    color: '#6C757D',
  },
  shareButton: {
    marginTop: 16,
  },
  gameOverButtons: {
    marginTop: 16,
    gap: 8,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 12,
  },
  hintButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(244,162,97,0.3)',
    backgroundColor: 'rgba(244,162,97,0.08)',
  },
  hintButtonDisabled: {
    opacity: 0.3,
  },
  hintButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#F4A261',
  },
  hintSuggestion: {
    fontSize: 13,
    fontStyle: 'italic',
    color: '#F4A261',
  },
  offscreen: {
    position: 'absolute',
    left: -9999,
  },
});
