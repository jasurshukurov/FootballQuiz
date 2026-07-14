import React, { useMemo } from 'react';
import { Text, StyleSheet } from 'react-native';
import ShakeView from '@/components/ui/ShakeView';
import Tappable from '@/components/ui/Tappable';
import { type, spacing, borderRadius } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';

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
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const cardStyle = correct
    ? styles.correctCard
    : wrong
      ? styles.wrongCard
      : selected
        ? styles.selectedCard
        : styles.defaultCard;

  return (
    <ShakeView shake={!!wrong}>
      {/* Result haptics (success/error) fire from the screen — no tap impact. */}
      <Tappable
        onPress={onPress}
        disabled={disabled}
        haptic="none"
        hoverStyle={{ backgroundColor: colors.bgCardPressed }}
        style={[styles.card, cardStyle, correct ? shadows.neonGlow : undefined]}>
        <Text style={styles.playerName}>{playerName}</Text>
      </Tappable>
    </ShakeView>
  );
}

export default React.memo(TransferCard);

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    card: {
      alignSelf: 'center',
      width: '90%',
      minHeight: 64,
      backgroundColor: c.bgCard,
      borderWidth: 1.5,
      borderColor: c.border,
      borderRadius: borderRadius.xl,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.xl,
    },
    defaultCard: {
      // uses base card styles
    },
    correctCard: {
      backgroundColor: c.accentSoft,
      borderColor: c.accent,
      borderWidth: 2.5,
    },
    wrongCard: {
      backgroundColor: c.dangerSoft,
      borderColor: c.danger,
      borderWidth: 2.5,
    },
    selectedCard: {
      borderColor: c.borderStrong,
      borderWidth: 2,
    },
    playerName: {
      ...type.h2,
      color: c.textPrimary,
      textTransform: 'uppercase',
      letterSpacing: 2,
      textAlign: 'center',
    },
  });
