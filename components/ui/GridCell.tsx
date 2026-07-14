import React, { useMemo } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { borderRadius, fonts, spacing, type } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';
import Tappable, { TappableState } from './Tappable';
import PopInView from './PopInView';
import ShakeView from './ShakeView';

type GridCellState = 'empty' | 'selected' | 'correct' | 'wrong';

/** Fit long names in a ~96pt square: "Pierre-Emerick Aubameyang" ->
 *  "P. Aubameyang" (RN-web ignores adjustsFontSizeToFit, so shorten instead). */
function shortDisplayName(name: string): string {
  if (name.length <= 16) return name;
  const parts = name.split(' ');
  if (parts.length < 2) return name;
  return `${parts[0][0]}. ${parts.slice(1).join(' ')}`;
}

interface GridCellProps {
  state: GridCellState;
  playerName?: string;
  /** Correct pick of an obscure player — renders the DEEP CUT tag. */
  deepCut?: boolean;
  onPress?: () => void;
  disabled?: boolean;
}

interface CellTokens {
  borderColor: string;
  backgroundColor: string;
}

const buildStateMaps = (c: ThemeColors) => ({
  base: {
    empty: { borderColor: c.accentBorder, backgroundColor: c.bgCard },
    selected: { borderColor: c.accent, backgroundColor: c.accentSoft },
    correct: { borderColor: c.accent, backgroundColor: c.accentSoft },
    wrong: { borderColor: c.danger, backgroundColor: c.dangerSoft },
  } as Record<GridCellState, CellTokens>,
  active: {
    empty: { borderColor: c.accent, backgroundColor: c.accentSoft },
    selected: { borderColor: c.accent, backgroundColor: c.accentSoft },
    correct: { borderColor: c.accent, backgroundColor: c.accentSoft },
    wrong: { borderColor: c.danger, backgroundColor: c.dangerSoft },
  } as Record<GridCellState, CellTokens>,
});

/**
 * One 3x3 board square. Empty = tappable "?" target; correct = the player's
 * name (+ optional DEEP CUT tag); 'wrong' is a transient flash — the square
 * stays open, the guess is what's spent.
 */
function GridCell({
  state,
  playerName,
  deepCut = false,
  onPress,
  disabled = false,
}: GridCellProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const maps = useMemo(() => buildStateMaps(colors), [colors]);
  const isDisabled = disabled || state === 'correct';

  const cellStyle = ({ pressed, hovered }: TappableState) => {
    const active = (pressed || hovered) && !isDisabled;
    const tokens = active ? maps.active[state] : maps.base[state];
    return [
      layout.base,
      { borderColor: tokens.borderColor, backgroundColor: tokens.backgroundColor },
    ];
  };

  const displayName = playerName ? shortDisplayName(playerName) : undefined;
  // Manual size tier: RN-web ignores adjustsFontSizeToFit, and a >9-char word
  // ("Aubameyang") breaks mid-word at caption size in a ~96pt square.
  const nameFitsCaption =
    !displayName || Math.max(...displayName.split(/[\s-]/).map((w) => w.length)) <= 9;

  // The animated wrappers (PopInView/ShakeView) are content-sized, so they
  // wrap the INNER content only — the outer wrapper owns the square's size
  // (flex + aspectRatio) and can never be stretched by a long name.
  let inner = playerName ? (
    <View style={layout.inner}>
      <Text
        style={nameFitsCaption ? styles.playerName : styles.playerNameSmall}
        adjustsFontSizeToFit
        minimumFontScale={0.65}
        numberOfLines={3}>
        {displayName}
      </Text>
      {deepCut ? (
        <View style={styles.deepCutTag}>
          <Text style={styles.deepCutText}>DEEP CUT</Text>
        </View>
      ) : null}
    </View>
  ) : (
    <View style={layout.inner}>
      <View style={styles.emptyCircle}>
        <Text style={styles.questionMark}>?</Text>
      </View>
    </View>
  );

  if (state === 'correct') inner = <PopInView>{inner}</PopInView>;
  if (state === 'wrong') inner = <ShakeView shake={true}>{inner}</ShakeView>;

  return (
    <View style={layout.wrap}>
      <Tappable onPress={() => onPress?.()} disabled={isDisabled} hitSlop={0} style={cellStyle}>
        {inner}
      </Tappable>
    </View>
  );
}

export default React.memo(GridCell);

const layout = StyleSheet.create({
  wrap: {
    flex: 1,
    // Web: flex items default to min-width auto, so a long player name would
    // widen the square and blow up the whole row. Content never sets the size.
    minWidth: 0,
    aspectRatio: 1,
    minHeight: 88,
  },
  base: {
    flex: 1,
    overflow: 'hidden',
    // Stretch (not center) the cross axis so the animated inner wrapper gets
    // the full cell width and the name TEXT wraps instead of overflowing.
    alignItems: 'stretch',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    padding: spacing.xs,
    borderWidth: 2,
  },
  inner: {
    alignItems: 'center',
    gap: spacing.xs,
  },
});

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    playerName: {
      ...type.captionBold,
      fontFamily: fonts.bodyBold,
      textAlign: 'center',
      color: c.textPrimary,
    },
    playerNameSmall: {
      ...type.micro,
      fontFamily: fonts.bodyBold,
      textAlign: 'center',
      color: c.textPrimary,
    },
    deepCutTag: {
      paddingHorizontal: spacing.xs,
      paddingVertical: 1,
      borderRadius: borderRadius.sm,
      backgroundColor: c.streak,
    },
    deepCutText: {
      ...type.micro,
      color: c.textOnAccent,
    },
    emptyCircle: {
      height: 28,
      width: 28,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: borderRadius.full,
      borderWidth: 1,
      borderColor: c.accentBorder,
    },
    questionMark: {
      ...type.caption,
      color: c.accent,
    },
  });
