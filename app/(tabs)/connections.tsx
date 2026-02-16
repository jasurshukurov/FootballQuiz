import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { StyleSheet, Text, View, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { generateConnectionsPuzzle, ConnectionsPuzzle } from '@/lib/connectionsGenerator';
import { useDailyProgressStore } from '@/hooks/useDailyProgressStore';
import ConnectionsBoard, { TileData, SolvedCategory } from '@/components/games/ConnectionsBoard';
import RetroButton from '@/components/ui/RetroButton';
import { colors, fonts, borderRadius } from '@/constants/theme';
import { useManagerStore } from '@/hooks/useManagerStore';
import ShareableConnectionsResult from '@/components/ShareableConnectionsResult';
import { captureAndShare } from '@/lib/sharing';
import { playCheer } from '@/lib/sounds';

const MAX_MISTAKES = 4;

export default function ConnectionsScreen() {
  const [puzzle, setPuzzle] = useState<ConnectionsPuzzle | null>(null);
  const [tileNames, setTileNames] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [solvedCategories, setSolvedCategories] = useState<SolvedCategory[]>([]);
  const [solvedNames, setSolvedNames] = useState<Set<string>>(new Set());
  const [mistakes, setMistakes] = useState(0);
  const [shaking, setShaking] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [flashingDotIdx, setFlashingDotIdx] = useState<number | null>(null);
  const shareRef = useRef<View>(null);

  const initPuzzle = useCallback(() => {
    const seed = Date.now();
    const p = generateConnectionsPuzzle(seed);
    setPuzzle(p);
    setTileNames(p.shuffledNames);
    setSelected(new Set());
    setSolvedCategories([]);
    setSolvedNames(new Set());
    setMistakes(0);
    setShaking(false);
    setShowModal(false);
    setGameOver(false);
    setFlashingDotIdx(null);
  }, []);

  useEffect(() => {
    initPuzzle();
  }, [initPuzzle]);

  const handleTilePress = useCallback(
    (name: string) => {
      if (gameOver) return;
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(name)) {
          next.delete(name);
        } else if (next.size < 4) {
          next.add(name);
        }
        return next;
      });
    },
    [gameOver],
  );

  const handleSubmit = useCallback(() => {
    if (!puzzle || selected.size !== 4) return;

    const selectedArr = Array.from(selected);
    const matchedCategory = puzzle.categories.find(
      (cat) =>
        !solvedCategories.some((s) => s.name === cat.name) &&
        cat.playerNames.every((name) => selectedArr.includes(name)),
    );

    if (matchedCategory) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const newSolved: SolvedCategory = {
        name: matchedCategory.name,
        color: matchedCategory.color,
        playerNames: matchedCategory.playerNames,
      };
      const updatedSolved = [...solvedCategories, newSolved];
      setSolvedCategories(updatedSolved);
      setSolvedNames((prev) => {
        const next = new Set(prev);
        matchedCategory.playerNames.forEach((n) => next.add(n));
        return next;
      });
      setSelected(new Set());

      if (updatedSolved.length >= 4) {
        useManagerStore.getState().addXp('connections', 4 * 25 + (mistakes === 0 ? 50 : 0));
        setGameOver(true);
        playCheer();
        useDailyProgressStore.getState().markCompleted('connections', 4 - mistakes);
        setTimeout(() => setShowModal(true), 600);
      }
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setShaking(true);
      const newMistakes = mistakes + 1;
      setMistakes(newMistakes);

      // Flash the dot being lost
      const dotIdx = MAX_MISTAKES - newMistakes;
      setFlashingDotIdx(dotIdx);
      setTimeout(() => setFlashingDotIdx(null), 300);

      setTimeout(() => {
        setShaking(false);
        setSelected(new Set());
      }, 400);

      if (newMistakes >= MAX_MISTAKES) {
        useManagerStore.getState().addXp('connections', solvedCategories.length * 25);
        setGameOver(true);
        useDailyProgressStore.getState().markCompleted('connections', solvedCategories.length);
        setTimeout(() => setShowModal(true), 600);
      }
    }
  }, [puzzle, selected, solvedCategories, mistakes]);

  const handleDeselectAll = useCallback(() => {
    setSelected(new Set());
  }, []);

  const handleShuffle = useCallback(() => {
    setTileNames((prev) => {
      const remaining = prev.filter((n) => !solvedNames.has(n));
      const shuffled = [...remaining].sort(() => Math.random() - 0.5);
      const solved = prev.filter((n) => solvedNames.has(n));
      return [...solved, ...shuffled];
    });
  }, [solvedNames]);

  const tiles: TileData[] = useMemo(() => {
    return tileNames.map((name) => ({
      name,
      selected: selected.has(name),
      solved: solvedNames.has(name),
    }));
  }, [tileNames, selected, solvedNames]);

  const won = solvedCategories.length >= 4;

  if (!puzzle) {
    return (
      <LinearGradient
        colors={['#0D1B2A', '#1B0A2E']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}>
        <SafeAreaView style={styles.loadingContainer} edges={['bottom']}>
          <Text style={styles.loadingText}>Loading puzzle...</Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#0D1B2A', '#1B0A2E']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.container}>
          <Text style={styles.title}>CONNECTIONS</Text>
          <Text style={styles.subtitle}>Find 4 groups of 4 players</Text>

          <ConnectionsBoard
            tiles={tiles}
            solvedCategories={solvedCategories}
            onTilePress={handleTilePress}
            shaking={shaking}
            disabled={gameOver}
          />

          {/* Mistake dots */}
          <View style={styles.mistakesRow}>
            <Text style={styles.mistakesLabel}>Mistakes remaining:</Text>
            <View style={styles.dots}>
              {Array.from({ length: MAX_MISTAKES }).map((_, i) => {
                const isActive = i < MAX_MISTAKES - mistakes;
                const isFlashing = i === flashingDotIdx;
                return (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      isFlashing
                        ? styles.dotFlashing
                        : isActive
                          ? styles.dotActive
                          : styles.dotUsed,
                    ]}
                  />
                );
              })}
            </View>
          </View>

          {/* Action buttons */}
          {!gameOver && (
            <View style={styles.buttonRow}>
              <View style={styles.buttonWrapper}>
                <RetroButton title="Shuffle" onPress={handleShuffle} variant="secondary" />
              </View>
              <View style={styles.buttonWrapper}>
                <RetroButton
                  title="Deselect All"
                  onPress={handleDeselectAll}
                  variant="secondary"
                  disabled={selected.size === 0}
                />
              </View>
              <View style={styles.buttonWrapper}>
                <RetroButton
                  title="Submit"
                  onPress={handleSubmit}
                  variant="primary"
                  disabled={selected.size !== 4}
                />
              </View>
            </View>
          )}
        </View>

        {/* Result Modal */}
        <Modal visible={showModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{won ? 'WELL PLAYED!' : 'FULL TIME'}</Text>
              <Text style={styles.modalSubtitle}>
                {won
                  ? `You solved it with ${mistakes} mistake${mistakes !== 1 ? 's' : ''}!`
                  : 'Better luck next time'}
              </Text>

              {/* Show all categories */}
              <View style={styles.modalCategories}>
                {puzzle.categories.map((cat) => (
                  <View key={cat.name} style={[styles.modalCatRow, { backgroundColor: cat.color }]}>
                    <Text style={styles.modalCatName}>{cat.name}</Text>
                    <Text style={styles.modalCatPlayers}>{cat.playerNames.join(', ')}</Text>
                  </View>
                ))}
              </View>

              <Pressable style={styles.shareBtn} onPress={() => captureAndShare(shareRef)}>
                <Text style={styles.shareBtnText}>Share Result</Text>
              </Pressable>
              <Pressable style={styles.playAgainBtn} onPress={initPuzzle}>
                <Text style={styles.playAgainBtnText}>Play Again</Text>
              </Pressable>
              <Pressable style={styles.modalCloseBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.modalCloseText}>Close</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* Offscreen shareable view */}
        <View style={styles.offscreen}>
          <View ref={shareRef} collapsable={false}>
            <ShareableConnectionsResult
              categories={puzzle.categories}
              solvedOrder={solvedCategories.map((s) => s.name)}
              mistakes={mistakes}
            />
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
  loadingText: {
    color: colors.chalkWhite,
  },
  title: {
    fontSize: 28,
    fontFamily: fonts.heading,
    color: colors.pitchGreen,
    textAlign: 'center',
    letterSpacing: 3,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: fonts.subheading,
    color: colors.steelGray,
    textAlign: 'center',
    marginBottom: 20,
  },
  mistakesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 8,
  },
  mistakesLabel: {
    fontSize: 12,
    color: colors.steelGray,
    fontFamily: fonts.scoreboard,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  dotActive: {
    backgroundColor: colors.pitchGreen,
    shadowColor: '#05F26C',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  dotFlashing: {
    backgroundColor: '#E63946',
  },
  dotUsed: {
    backgroundColor: 'rgba(108,117,125,0.2)',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
    justifyContent: 'center',
  },
  buttonWrapper: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: colors.retroBlack,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.pitchGreen,
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 28,
    fontFamily: fonts.heading,
    color: colors.pitchGreen,
    letterSpacing: 3,
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: fonts.scoreboard,
    color: colors.chalkWhite,
    marginTop: 8,
    marginBottom: 20,
  },
  modalCategories: {
    width: '100%',
    gap: 8,
  },
  modalCatRow: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  modalCatName: {
    fontSize: 13,
    fontFamily: fonts.heading,
    color: colors.retroBlack,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  modalCatPlayers: {
    fontSize: 11,
    fontFamily: fonts.subheading,
    color: colors.retroBlack,
    marginTop: 2,
  },
  shareBtn: {
    marginTop: 20,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.pitchGreen,
    backgroundColor: colors.pitchGreen,
  },
  shareBtnText: {
    fontSize: 16,
    fontFamily: fonts.subheading,
    color: colors.retroBlack,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  playAgainBtn: {
    marginTop: 12,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.pitchGreen,
    backgroundColor: colors.pitchGreen,
  },
  playAgainBtnText: {
    fontSize: 16,
    fontFamily: fonts.subheading,
    color: colors.retroBlack,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  modalCloseBtn: {
    marginTop: 12,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.pitchGreen,
  },
  modalCloseText: {
    fontSize: 16,
    fontFamily: fonts.subheading,
    color: colors.pitchGreen,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  offscreen: {
    position: 'absolute',
    left: -9999,
  },
});
