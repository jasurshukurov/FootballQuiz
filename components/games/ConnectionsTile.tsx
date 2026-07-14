import React, { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { type, borderRadius, spacing } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';
import { triggerImpact } from '@/lib/haptics';

/**
 * Connections group colors, keyed on the puzzle's semantic `difficulty` index
 * (0 easiest .. 3 hardest — the NYT yellow/green/blue/purple ladder).
 *
 * DOCUMENTED EXCEPTION to the no-hex rule: like club-jersey maps these are game
 * DATA, not theme — the four groups must stay the same recognizable hues on
 * every theme so share cards and solved rows read consistently. The map is
 * keyed on `theme.dark`: dark themes get slightly deeper fills, light themes
 * (daybreak, vintage) the classic NYT pastels. Every bg/ink pair holds >= 4.5:1
 * contrast, and the four hues stay mutually distinguishable on all four themes.
 */
const GROUP_COLORS: Record<'dark' | 'light', { bg: string; text: string }[]> = {
  dark: [
    { bg: '#D9B93E', text: '#181203' }, // yellow — easiest
    { bg: '#8DB94F', text: '#101B06' }, // green
    { bg: '#7EA6E0', text: '#0A1526' }, // blue
    { bg: '#B07CC6', text: '#1D0F26' }, // purple — hardest
  ],
  light: [
    { bg: '#F5DA5F', text: '#3A2E05' }, // yellow — easiest
    { bg: '#A5C55C', text: '#1F3006' }, // green
    { bg: '#AFC3EE', text: '#122045' }, // blue
    { bg: '#BB84C8', text: '#2E1140' }, // purple — hardest
  ],
};

/** Theme-aware color pair for a Connections group difficulty (0..3). */
export function connectionsGroupColor(
  difficulty: number,
  dark: boolean,
): { bg: string; text: string } {
  const ladder = GROUP_COLORS[dark ? 'dark' : 'light'];
  return ladder[Math.max(0, Math.min(ladder.length - 1, difficulty))];
}

interface ConnectionsTileProps {
  name: string;
  selected: boolean;
  solved: boolean;
  /** Group difficulty (0..3) for solved tiles — maps to the group color. */
  solvedDifficulty?: number;
  onPress: () => void;
  disabled: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function ConnectionsTile({
  name,
  selected,
  solved,
  solvedDifficulty,
  onPress,
  disabled,
}: ConnectionsTileProps) {
  const theme = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const scale = useSharedValue(1);
  const borderWidthVal = useSharedValue(1);
  const elevationVal = useSharedValue(0);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const ease = { duration: 200, easing: Easing.out(Easing.cubic) };
    if (selected) {
      borderWidthVal.value = withTiming(2.5, ease);
      elevationVal.value = withTiming(12, ease);
      scale.value = withTiming(1.03, ease);
    } else {
      borderWidthVal.value = withTiming(1, { duration: 150 });
      elevationVal.value = withTiming(0, { duration: 150 });
      scale.value = withTiming(1, { duration: 150 });
    }
  }, [selected, borderWidthVal, elevationVal, scale]);

  // Selection visuals stay primary; web hover only lightens the border.
  const animatedStyle = useAnimatedStyle(
    () => ({
      transform: [{ scale: scale.value }],
      borderWidth: borderWidthVal.value,
      borderColor: selected ? colors.accent : hovered ? colors.borderStrong : colors.border,
      shadowColor: selected ? colors.accent : '#000',
      shadowOffset: { width: 0, height: selected ? 0 : 2 },
      shadowOpacity: selected ? 0.5 : 0.2,
      shadowRadius: selected ? 10 : 4,
      elevation: elevationVal.value,
    }),
    [selected, hovered, colors],
  );

  const handlePressIn = () => {
    scale.value = withTiming(0.96, { duration: 100, easing: Easing.out(Easing.quad) });
  };

  const handlePressOut = () => {
    scale.value = withTiming(selected ? 1.03 : 1, {
      duration: 150,
      easing: Easing.out(Easing.quad),
    });
  };

  const handlePress = () => {
    triggerImpact();
    onPress();
  };

  if (solved) {
    const group = connectionsGroupColor(solvedDifficulty ?? 0, theme.dark);
    return (
      <View style={[styles.tile, styles.solvedTile, { backgroundColor: group.bg }]}>
        <Text
          style={[styles.tileText, { color: group.text }]}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          numberOfLines={2}>
          {name}
        </Text>
      </View>
    );
  }

  return (
    <AnimatedPressable
      accessibilityRole="button"
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      disabled={disabled}
      style={[
        webCursor,
        styles.tile,
        selected ? styles.selectedBg : styles.defaultBg,
        animatedStyle,
      ]}>
      <Text
        style={[styles.tileText, selected && styles.selectedText]}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        numberOfLines={2}>
        {name}
      </Text>
    </AnimatedPressable>
  );
}

const webCursor = Platform.OS === 'web' ? ({ cursor: 'pointer' } as const) : undefined;

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    tile: {
      height: 64,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.xs,
    },
    defaultBg: {
      backgroundColor: c.bgCard,
    },
    selectedBg: {
      backgroundColor: c.accentSoft,
    },
    solvedTile: {
      borderWidth: 0,
    },
    tileText: {
      ...type.captionBold,
      color: c.textPrimary,
      textAlign: 'center',
      // Fast/double taps on web must not select the tile label.
      userSelect: 'none',
    },
    selectedText: {
      color: c.accentBright,
    },
  });
