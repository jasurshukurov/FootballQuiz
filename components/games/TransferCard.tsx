import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import ShakeView from '@/components/ui/ShakeView';
import { colors, fonts, borderRadius, shadows } from '@/constants/theme';

interface TransferCardProps {
  playerName: string;
  selected: boolean;
  correct?: boolean;
  wrong?: boolean;
  onPress: () => void;
  disabled: boolean;
}

function TransferCard({
  playerName,
  selected,
  correct,
  wrong,
  onPress,
  disabled,
}: TransferCardProps) {
  const cardStyle = correct
    ? styles.correctCard
    : wrong
      ? styles.wrongCard
      : selected
        ? styles.selectedCard
        : styles.defaultCard;

  return (
    <ShakeView shake={!!wrong}>
      <Pressable onPress={onPress} disabled={disabled}>
        <View style={[styles.card, cardStyle, correct && shadows.neonGlow]}>
          <Text style={styles.playerName}>{playerName}</Text>
        </View>
      </Pressable>
    </ShakeView>
  );
}

export default React.memo(TransferCard);

const styles = StyleSheet.create({
  card: {
    alignSelf: 'center',
    width: '90%',
    minHeight: 64,
    backgroundColor: 'rgba(17,17,40,0.85)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  defaultCard: {
    // uses base card styles
  },
  correctCard: {
    backgroundColor: 'rgba(5,242,108,0.2)',
    borderColor: colors.pitchGreen,
    borderWidth: 2.5,
  },
  wrongCard: {
    backgroundColor: 'rgba(230,57,70,0.2)',
    borderColor: colors.cardRed,
    borderWidth: 2.5,
  },
  selectedCard: {
    borderColor: colors.chalkWhite,
    borderWidth: 2,
  },
  playerName: {
    fontSize: 20,
    fontFamily: fonts.heading,
    color: colors.chalkWhite,
    textTransform: 'uppercase',
    letterSpacing: 2,
    textAlign: 'center',
  },
});
