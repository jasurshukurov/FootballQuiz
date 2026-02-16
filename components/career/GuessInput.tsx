import React, { useCallback } from 'react';
import { TextInput, Pressable, StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import { colors, spacing, borderRadius } from '@/constants/theme';

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
  const handleSubmit = useCallback(() => {
    if (value.trim().length > 0 && !disabled) {
      onSubmit();
    }
  }, [value, disabled, onSubmit]);

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder="Guess the player..."
          placeholderTextColor={colors.steelGray}
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
          editable={!disabled}
          autoCorrect={false}
          autoCapitalize="words"
        />
        <Pressable
          style={[styles.submitButton, disabled && styles.submitDisabled]}
          onPress={handleSubmit}
          disabled={disabled || value.trim().length === 0}>
          <Text style={styles.submitText}>Submit</Text>
        </Pressable>
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
                  backgroundColor: i < attemptsLeft ? colors.pitchGreen : colors.steelGray,
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

const styles = StyleSheet.create({
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
    borderColor: colors.steelGray,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    color: colors.chalkWhite,
    fontSize: 16,
    backgroundColor: colors.retroBlack,
  },
  submitButton: {
    height: 48,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.pitchGreen,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  submitDisabled: {
    opacity: 0.4,
  },
  submitText: {
    color: colors.retroBlack,
    fontSize: 16,
    fontWeight: '700',
  },
  attemptsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    backgroundColor: 'transparent',
  },
  attemptsText: {
    fontSize: 13,
    color: colors.steelGray,
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
