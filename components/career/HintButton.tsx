import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

import { borderRadius, spacing, type } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';
import Tappable from '@/components/ui/Tappable';

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
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const isDisabled = disabled || isLocked || isUnlocked;

  const textColor = isUnlocked ? colors.textOnAccent : isLocked ? colors.textMuted : colors.accent;

  return (
    <Tappable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        isUnlocked && styles.buttonUnlocked,
        isLocked && styles.buttonLocked,
        !isUnlocked && !isLocked && styles.buttonAvailable,
        pressed && !isDisabled && styles.buttonPressed,
      ]}
      hoverStyle={!isDisabled ? { backgroundColor: colors.accentSoft } : undefined}
      accessibilityLabel={label}>
      {isLocked ? (
        <View style={styles.iconContainer}>
          <FontAwesome name="lock" size={20} color={colors.textMuted} />
        </View>
      ) : isUnlocked ? (
        <View style={styles.iconContainer}>
          <FontAwesome name="check" size={16} color={colors.textOnAccent} />
        </View>
      ) : (
        <View style={styles.iconContainer}>
          <FontAwesome
            name={icon as React.ComponentProps<typeof FontAwesome>['name']}
            size={16}
            color={colors.accent}
          />
        </View>
      )}

      <Text style={[styles.label, { color: textColor }]} numberOfLines={2}>
        {label}
      </Text>

      {isPremium && !isUnlocked && !isLocked && (
        <View style={styles.badge}>
          <FontAwesome name="play-circle" size={14} color={colors.streak} />
        </View>
      )}

      {!isPremium && !isUnlocked && !isLocked && <View style={styles.badgePlaceholder} />}
    </Tappable>
  );
}

export const HintButton = React.memo(HintButtonInner);

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
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
      backgroundColor: c.bgElevated,
      borderWidth: 1.5,
      borderColor: c.accent,
    },
    buttonUnlocked: {
      backgroundColor: c.accent,
      borderWidth: 1.5,
      borderColor: c.accent,
    },
    buttonLocked: {
      backgroundColor: c.bgCard,
      borderWidth: 1.5,
      borderColor: c.border,
      transform: [{ scale: 0.97 }],
      overflow: 'hidden',
    },
    buttonPressed: {
      opacity: 0.7,
    },
    iconContainer: {
      width: 24,
      alignItems: 'center',
      backgroundColor: 'transparent',
    },
    label: {
      flex: 1,
      ...type.captionBold,
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
