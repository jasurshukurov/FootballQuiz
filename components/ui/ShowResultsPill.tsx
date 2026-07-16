import React, { useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';

import Tappable from '@/components/ui/Tappable';
import { borderRadius, spacing, touch, type } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';

interface ShowResultsPillProps {
  onPress: () => void;
  title?: string;
}

/**
 * The way back into a dismissed game-over sheet. Every sheet mode (Missing XI,
 * Connections, Who Are Ya) renders one of these in-flow once the sheet is
 * closed, so studying the revealed board never strands the player away from
 * their result. In-flow on purpose: an absolute overlay anchored to scroll
 * CONTENT (not the viewport) drifted under the floating tab bar.
 */
export default function ShowResultsPill({ onPress, title = 'Show results' }: ShowResultsPillProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Tappable
      haptic="none"
      onPress={onPress}
      accessibilityLabel={title}
      hoverStyle={{ backgroundColor: colors.bgCardPressed }}
      style={styles.pill}>
      <Text style={styles.label}>{title}</Text>
    </Tappable>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    pill: {
      alignSelf: 'center',
      minHeight: touch.min,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.full,
      borderWidth: 1,
      borderColor: c.accentBorder,
      backgroundColor: c.bgElevated,
    },
    label: {
      ...type.captionBold,
      color: c.accent,
      textTransform: 'uppercase',
      letterSpacing: 1,
      userSelect: 'none',
    },
  });
