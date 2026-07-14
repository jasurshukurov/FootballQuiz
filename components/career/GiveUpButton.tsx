import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { type, spacing, borderRadius, touch } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';
import { triggerImpact } from '@/lib/haptics';
import { ImpactFeedbackStyle } from 'expo-haptics';

interface GiveUpButtonProps {
  onGiveUp: () => void;
}

// Deliberately NOT a Tappable: the hold-to-confirm long-press is the whole
// point of this control (prevents accidental reveals), which Tappable's
// tap-only API can't express.
function GiveUpButton({ onGiveUp }: GiveUpButtonProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [pressing, setPressing] = useState(false);

  const handleLongPress = () => {
    triggerImpact(ImpactFeedbackStyle.Heavy);
    onGiveUp();
  };

  return (
    <View style={styles.wrapper}>
      <Pressable
        onLongPress={handleLongPress}
        delayLongPress={500}
        onPressIn={() => setPressing(true)}
        onPressOut={() => setPressing(false)}
        style={[styles.button, pressing && styles.buttonPressed]}>
        <Text style={styles.label}>Give Up</Text>
      </Pressable>
      <Text style={styles.hint}>Hold to reveal</Text>
    </View>
  );
}

export default React.memo(GiveUpButton);

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    wrapper: {
      alignItems: 'center',
    },
    button: {
      backgroundColor: c.bgCard,
      borderWidth: 1,
      borderColor: c.dangerSoft,
      borderRadius: borderRadius.full,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      minHeight: touch.min,
      justifyContent: 'center',
      alignItems: 'center',
    },
    buttonPressed: {
      borderColor: c.danger,
      backgroundColor: c.bgCardPressed,
    },
    label: {
      ...type.captionBold,
      color: c.textSecondary,
    },
    hint: {
      ...type.micro,
      color: c.textMuted,
      textAlign: 'center',
      marginTop: spacing.xs + 2,
    },
  });
