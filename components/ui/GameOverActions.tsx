import React, { RefObject } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '@/constants/theme';
import { FEATURES } from '@/lib/featureFlags';
import { captureAndShare } from '@/lib/sharing';
import RetroButton from '@/components/ui/RetroButton';
import CopyResultButton from '@/components/ui/CopyResultButton';
import GameOverExtras from '@/components/ui/GameOverExtras';

type Variant = 'primary' | 'secondary' | 'danger';

interface GameOverActionsProps {
  shareRef: RefObject<View | null>;
  shareText: string;
  /** Fire the confetti burst (win / strong result). */
  win: boolean;
  /** Optional Play Again handler; when omitted no play-again button renders. */
  onPlayAgain?: () => void;
  playAgainLabel?: string;
  playAgainVariant?: Variant;
  shareVariant?: Variant;
  /** Render the confetti + streak + countdown block. Set false when the screen
   *  places GameOverExtras itself (e.g. outside a modal card for full-screen
   *  confetti). Defaults to true. */
  includeExtras?: boolean;
  /** Mode just finished — forwarded to GameOverExtras to exclude from "Next up". */
  currentModeKey?: string;
}

/** The shared game-over action stack — "Share Result" + "Copy Result" side by
 *  side (Claude Design game-over spec), an optional "Play Again" below, and
 *  the confetti/streak/countdown flourish — that was previously copy-pasted
 *  (with drift) across every mode's result screen. */
export default function GameOverActions({
  shareRef,
  shareText,
  win,
  onPlayAgain,
  playAgainLabel = 'Play Again',
  playAgainVariant = 'primary',
  shareVariant = 'primary',
  includeExtras = true,
  currentModeKey,
}: GameOverActionsProps) {
  return (
    <View style={styles.container}>
      {FEATURES.sharing && (
        <View style={styles.shareRow}>
          <View style={styles.rowButton}>
            <RetroButton
              title="Share Result"
              variant={shareVariant}
              onPress={() => captureAndShare(shareRef, shareText)}
            />
          </View>
          <View style={styles.rowButton}>
            <CopyResultButton text={shareText} />
          </View>
        </View>
      )}
      {onPlayAgain && (
        <View style={styles.button}>
          <RetroButton title={playAgainLabel} variant={playAgainVariant} onPress={onPlayAgain} />
        </View>
      )}
      {includeExtras && <GameOverExtras win={win} currentModeKey={currentModeKey} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  shareRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  rowButton: {
    flex: 1,
  },
  button: {
    width: '100%',
    maxWidth: 440,
    minWidth: 220,
    alignSelf: 'center',
  },
});
