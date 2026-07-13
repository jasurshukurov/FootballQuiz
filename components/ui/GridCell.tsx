import React, { useState } from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { colors } from '@/constants/theme';
import { triggerImpact } from '@/lib/haptics';
import PopInView from './PopInView';
import ShakeView from './ShakeView';

type GridCellState = 'empty' | 'selected' | 'correct' | 'wrong';

interface GridCellProps {
  state: GridCellState;
  playerName?: string;
  onPress?: () => void;
  disabled?: boolean;
}

const stateStyleMap: Record<GridCellState, { borderColor: string; backgroundColor: string }> = {
  empty: { borderColor: `rgba(5,242,108,0.4)`, backgroundColor: 'rgba(26,26,46,0.6)' },
  selected: { borderColor: colors.cardYellow, backgroundColor: 'rgba(244,162,97,0.2)' },
  correct: { borderColor: colors.matchGreen, backgroundColor: 'rgba(82,183,136,0.2)' },
  wrong: { borderColor: colors.cardRed, backgroundColor: 'rgba(230,57,70,0.2)' },
};

const pressedStateStyleMap: Record<
  GridCellState,
  { borderColor: string; backgroundColor: string }
> = {
  empty: { borderColor: colors.pitchGreen, backgroundColor: 'rgba(5,242,108,0.15)' },
  selected: { borderColor: colors.cardYellow, backgroundColor: 'rgba(244,162,97,0.3)' },
  correct: { borderColor: colors.matchGreen, backgroundColor: 'rgba(82,183,136,0.2)' },
  wrong: { borderColor: colors.cardRed, backgroundColor: 'rgba(230,57,70,0.2)' },
};

function GridCell({ state, playerName, onPress, disabled = false }: GridCellProps) {
  const [pressed, setPressed] = useState(false);
  const isDisabled = disabled || state === 'correct' || state === 'wrong';

  const dynamicStyle = pressed && !isDisabled ? pressedStateStyleMap[state] : stateStyleMap[state];

  const handlePress = () => {
    triggerImpact();
    onPress?.();
  };

  const content = (
    <Pressable
      onPress={handlePress}
      disabled={isDisabled}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[
        styles.base,
        { borderColor: dynamicStyle.borderColor, backgroundColor: dynamicStyle.backgroundColor },
      ]}>
      {playerName ? (
        <Text
          style={styles.playerName}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          numberOfLines={2}>
          {playerName}
        </Text>
      ) : (
        <View style={styles.emptyCircle}>
          <Text style={styles.questionMark}>?</Text>
        </View>
      )}
    </Pressable>
  );

  if (state === 'correct') {
    return <PopInView>{content}</PopInView>;
  }

  if (state === 'wrong') {
    return <ShakeView shake={true}>{content}</ShakeView>;
  }

  return content;
}

export default React.memo(GridCell);

const styles = StyleSheet.create({
  base: {
    minHeight: 44,
    minWidth: 44,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    padding: 4,
    borderWidth: 2,
  },
  playerName: {
    textAlign: 'center',
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.chalkWhite,
  },
  emptyCircle: {
    height: 24,
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: `rgba(5,242,108,0.3)`,
  },
  questionMark: {
    fontSize: 12,
    color: `rgba(5,242,108,0.5)`,
  },
});
