import React, { useState } from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { colors } from '@/constants/theme';
import { playClick } from '@/lib/sounds';
import { triggerImpact } from '@/lib/haptics';

interface RetroButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}

export default function RetroButton({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
}: RetroButtonProps) {
  const [pressed, setPressed] = useState(false);

  const variantStyle = disabled
    ? styles.disabled
    : pressed
      ? pressedVariantStyles[variant]
      : variantStyles[variant];

  const handlePress = () => {
    triggerImpact();
    playClick();
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[styles.base, variantStyle]}>
      <Text style={[styles.text, disabled && styles.textDisabled]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  disabled: {
    borderWidth: 2,
    borderColor: colors.steelGray,
    backgroundColor: 'rgba(108,117,125,0.5)',
  },
  text: {
    textAlign: 'center',
    fontSize: 16,
    fontFamily: 'BarlowCondensed-SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: colors.chalkWhite,
  },
  textDisabled: {
    color: 'rgba(245,245,240,0.5)',
  },
});

const variantStyles = StyleSheet.create({
  primary: {
    backgroundColor: colors.pitchGreen,
    borderWidth: 2,
    borderColor: colors.matchGreen,
  },
  secondary: {
    backgroundColor: colors.retroBlack,
    borderWidth: 2,
    borderColor: colors.steelGray,
  },
  danger: {
    backgroundColor: colors.cardRed,
    borderWidth: 2,
    borderColor: colors.cardRed,
  },
});

const pressedVariantStyles = StyleSheet.create({
  primary: {
    backgroundColor: colors.matchGreen,
    borderWidth: 2,
    borderColor: colors.pitchGreen,
  },
  secondary: {
    backgroundColor: colors.steelGray,
    borderWidth: 2,
    borderColor: colors.retroBlack,
  },
  danger: {
    backgroundColor: 'rgba(230,57,70,0.8)',
    borderWidth: 2,
    borderColor: colors.cardRed,
  },
});
