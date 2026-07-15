import React, { useMemo } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  useReducedMotion,
} from 'react-native-reanimated';

import PopInView from '@/components/ui/PopInView';
import ShakeView from '@/components/ui/ShakeView';
import Tappable from '@/components/ui/Tappable';
import PlayerPhoto from '@/components/ui/PlayerPhoto';
import { type, spacing, borderRadius } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';

interface JerseySlotProps {
  playerName?: string;
  /** players_db id for the revealed player's portrait; initials fallback when absent. */
  playerId?: string | number | null;
  revealed: boolean;
  shaking: boolean;
  position: string;
  jerseyColor: string;
  onPress: () => void;
}

function PulsingQuestion() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const opacity = useSharedValue(1);
  const reducedMotion = useReducedMotion();

  React.useEffect(() => {
    if (reducedMotion) {
      opacity.value = 0.7;
      return;
    }
    opacity.value = withRepeat(
      withTiming(0.3, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [opacity, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return <Animated.Text style={[styles.questionMark, animatedStyle]}>?</Animated.Text>;
}

export default function JerseySlot({
  playerName,
  playerId,
  revealed,
  shaking,
  position,
  jerseyColor,
  onPress,
}: JerseySlotProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <ShakeView shake={shaking}>
      <Tappable onPress={onPress} disabled={revealed} style={layoutStyles.slotWrapper}>
        {revealed && playerName ? (
          <PopInView>
            {/* Revealed player's portrait, ringed in the club color (jerseyColor
                is real-world club color DATA, not theme). PlayerPhoto falls back
                to same-footprint initials when there's no licensed photo. */}
            <View style={[styles.photoRing, { borderColor: jerseyColor }]}>
              <PlayerPhoto playerId={playerId} name={playerName} size={40} />
            </View>
            <Text style={styles.playerName} numberOfLines={2} adjustsFontSizeToFit>
              {playerName}
            </Text>
          </PopInView>
        ) : (
          <View style={styles.unrevealedCircle}>
            <PulsingQuestion />
          </View>
        )}
        <Text style={styles.positionLabel}>{position}</Text>
      </Tappable>
    </ShakeView>
  );
}

// Layout-only styles stay module-scope.
const layoutStyles = StyleSheet.create({
  slotWrapper: {
    alignItems: 'center',
    width: 64,
  },
});

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    unrevealedCircle: {
      width: 48,
      height: 48,
      borderRadius: borderRadius.full,
      backgroundColor: c.bgCard,
      borderWidth: 1.5,
      borderColor: c.borderStrong,
      alignItems: 'center',
      justifyContent: 'center',
    },
    photoRing: {
      // 40pt portrait + 2pt padding + 2pt ring on each side = 48pt, matching the
      // unrevealed circle's footprint so the pitch never shifts on reveal.
      padding: 2,
      borderRadius: borderRadius.full,
      borderWidth: 2,
      alignSelf: 'center',
    },
    questionMark: {
      ...type.h3,
      color: c.textPrimary,
      textAlign: 'center',
    },
    playerName: {
      ...type.micro,
      color: c.textPrimary,
      textAlign: 'center',
      marginTop: spacing.xs / 2,
      paddingHorizontal: spacing.xs / 2,
    },
    positionLabel: {
      ...type.micro,
      color: c.textSecondary,
      textAlign: 'center',
      marginTop: spacing.xs / 2,
      textTransform: 'uppercase',
    },
  });
