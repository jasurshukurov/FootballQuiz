import React, { useCallback, useMemo } from 'react';
import { TextInput, StyleSheet, Text, View } from 'react-native';

import { spacing, borderRadius, type } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';
import Tappable from '@/components/ui/Tappable';

interface GuessInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  attemptsLeft: number;
  disabled?: boolean;
}

const MAX_ATTEMPTS = 3;

function GuessInputInner({
  value,
  onChangeText,
  onSubmit,
  attemptsLeft,
  disabled,
}: GuessInputProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleSubmit = useCallback(() => {
    if (value.trim().length > 0 && !disabled) {
      onSubmit();
    }
  }, [value, disabled, onSubmit]);

  const submitDisabled = disabled || value.trim().length === 0;

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder="Guess the player..."
          placeholderTextColor={colors.textMuted}
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
          editable={!disabled}
          autoCorrect={false}
          autoCapitalize="words"
        />
        <Tappable
          haptic="none"
          style={[styles.submitButton, submitDisabled && styles.submitDisabled]}
          onPress={handleSubmit}
          disabled={submitDisabled}>
          <Text style={styles.submitText}>Submit</Text>
        </Tappable>
      </View>
      <View style={styles.attemptsRow}>
        <Text style={styles.attemptsText}>
          {attemptsLeft} attempt{attemptsLeft !== 1 ? 's' : ''} left
        </Text>
        <View style={styles.dots}>
          {Array.from({ length: MAX_ATTEMPTS }, (_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i < attemptsLeft ? colors.accent : colors.border,
                },
              ]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

export const GuessInput = React.memo(GuessInputInner);

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: {
      paddingVertical: spacing.sm,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'transparent',
    },
    input: {
      flex: 1,
      height: 48,
      borderWidth: 1.5,
      borderColor: c.border,
      borderRadius: borderRadius.lg,
      paddingHorizontal: spacing.md,
      color: c.textPrimary,
      ...type.body,
      backgroundColor: c.bgElevated,
    },
    submitButton: {
      height: 48,
      paddingHorizontal: spacing.lg,
      backgroundColor: c.accent,
      borderRadius: borderRadius.lg,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: spacing.sm,
    },
    submitDisabled: {
      opacity: 0.4,
    },
    submitText: {
      ...type.bodyBold,
      color: c.textOnAccent,
    },
    attemptsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: spacing.sm,
      backgroundColor: 'transparent',
    },
    attemptsText: {
      ...type.caption,
      color: c.textSecondary,
      marginRight: spacing.sm,
    },
    dots: {
      flexDirection: 'row',
      gap: spacing.xs,
      backgroundColor: 'transparent',
    },
    dot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
  });
