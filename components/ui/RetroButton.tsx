import React, { useCallback, useMemo } from 'react';
import { StyleSheet, Text, TextStyle } from 'react-native';
import { borderRadius, spacing, touch, type } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';
import Tappable, { TappableHaptic, TappableState } from '@/components/ui/Tappable';
import { playClick } from '@/lib/sounds';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface RetroButtonProps {
  title: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  /** Haptic fired on press, forwarded to Tappable: light impact (default),
   *  success notification, or none. */
  haptic?: TappableHaptic;
}

interface VariantTokens {
  bg: string;
  bgPressed: string;
  label: string;
  border?: string;
}

const buildVariants = (c: ThemeColors): Record<Variant, VariantTokens> => ({
  primary: { bg: c.accent, bgPressed: c.accentDim, label: c.textOnAccent },
  secondary: {
    bg: c.bgCard,
    bgPressed: c.bgCardPressed,
    label: c.textPrimary,
    border: c.border,
  },
  danger: { bg: c.danger, bgPressed: c.dangerBright, label: c.textPrimary },
  ghost: { bg: 'transparent', bgPressed: c.accentSoft, label: c.accent },
});

/**
 * The single button primitive. Variants: primary (accent fill), secondary
 * (card + border), danger (red fill), ghost (transparent, accent label).
 * Primary CTAs are `touch.cta` (56pt) tall; every variant clears `touch.min`.
 * Built on Tappable: press-scale spring, web hover, haptic passthrough.
 */
export default function RetroButton({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  haptic = 'impact',
}: RetroButtonProps) {
  const { colors } = useTheme();
  const variants = useMemo(() => buildVariants(colors), [colors]);
  const tokens = variants[variant];

  const handlePress = useCallback(() => {
    playClick();
    onPress();
  }, [onPress]);

  const containerStyle = useCallback(
    ({ pressed }: TappableState) => [
      styles.base,
      {
        backgroundColor: disabled ? colors.bgCard : pressed ? tokens.bgPressed : tokens.bg,
        borderWidth: tokens.border ? 1 : 0,
        borderColor: tokens.border ?? 'transparent',
        height: variant === 'primary' ? touch.cta : undefined,
        opacity: disabled ? 0.5 : 1,
      },
    ],
    [colors, tokens, variant, disabled],
  );

  const labelStyle: TextStyle = { color: disabled ? colors.textMuted : tokens.label };

  return (
    <Tappable
      onPress={handlePress}
      haptic={haptic}
      disabled={disabled}
      hitSlop={0}
      accessibilityLabel={title}
      hoverStyle={{ backgroundColor: tokens.bgPressed }}
      style={containerStyle}>
      <Text style={[styles.text, labelStyle]}>{title}</Text>
    </Tappable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: touch.min,
    minWidth: touch.min,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  text: {
    ...type.bodyBold,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});
