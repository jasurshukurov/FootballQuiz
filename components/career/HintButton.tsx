import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

import { Text, View } from 'react-native';
import { colors, borderRadius, spacing } from '@/constants/theme';

interface HintButtonProps {
  hintId: string;
  label: string;
  icon: string;
  isUnlocked: boolean;
  isLocked: boolean;
  isPremium: boolean;
  onPress: () => void;
  disabled?: boolean;
}

function HintButtonInner({
  label,
  icon,
  isUnlocked,
  isLocked,
  isPremium,
  onPress,
  disabled,
}: HintButtonProps) {
  const [pressed, setPressed] = useState(false);

  const isDisabled = disabled || isLocked || isUnlocked;

  const handlePressIn = useCallback(() => setPressed(true), []);
  const handlePressOut = useCallback(() => setPressed(false), []);

  const buttonStyle = [
    styles.button,
    isUnlocked && styles.buttonUnlocked,
    isLocked && styles.buttonLocked,
    !isUnlocked && !isLocked && styles.buttonAvailable,
    pressed && !isDisabled && styles.buttonPressed,
  ];

  const textColor = isUnlocked
    ? colors.chalkWhite
    : isLocked
      ? 'rgba(108,117,125,0.4)'
      : colors.pitchGreen;

  return (
    <Pressable
      style={buttonStyle}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}>
      {isLocked && (
        <>
          <View style={styles.innerShadow} />
          <View style={styles.frostOverlay} />
        </>
      )}

      {isLocked ? (
        <View style={styles.iconContainer}>
          <FontAwesome name="lock" size={20} color={colors.steelGray} />
        </View>
      ) : isUnlocked ? (
        <View style={styles.iconContainer}>
          <FontAwesome name="check" size={16} color={colors.chalkWhite} />
        </View>
      ) : (
        <View style={styles.iconContainer}>
          <FontAwesome
            name={icon as React.ComponentProps<typeof FontAwesome>['name']}
            size={16}
            color={colors.pitchGreen}
          />
        </View>
      )}

      <Text style={[styles.label, { color: textColor }]} numberOfLines={2}>
        {label}
      </Text>

      {isPremium && !isUnlocked && !isLocked && (
        <View style={styles.badge}>
          <FontAwesome name="play-circle" size={14} color={colors.cardYellow} />
        </View>
      )}

      {!isPremium && !isUnlocked && !isLocked && <View style={styles.badgePlaceholder} />}
    </Pressable>
  );
}

export const HintButton = React.memo(HintButtonInner);

const styles = StyleSheet.create({
  button: {
    flex: 1,
    minHeight: 48,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  buttonAvailable: {
    backgroundColor: colors.retroBlack,
    borderWidth: 1.5,
    borderColor: colors.pitchGreen,
  },
  buttonUnlocked: {
    backgroundColor: colors.pitchGreen,
    borderWidth: 1.5,
    borderColor: colors.pitchGreen,
  },
  buttonLocked: {
    backgroundColor: 'rgba(13,27,42,0.6)',
    borderWidth: 1.5,
    borderColor: 'rgba(108,117,125,0.2)',
    transform: [{ scale: 0.97 }],
    overflow: 'hidden',
  },
  buttonPressed: {
    opacity: 0.7,
  },
  innerShadow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: borderRadius.lg,
  },
  frostOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(200,220,255,0.04)',
    borderRadius: borderRadius.lg,
  },
  iconContainer: {
    width: 24,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  label: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  badge: {
    width: 24,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  badgePlaceholder: {
    width: 24,
    backgroundColor: 'transparent',
  },
});
