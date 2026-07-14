import React, { useMemo, useState } from 'react';
import { TextInput, View, StyleSheet, Platform, TextStyle } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { spacing, type } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';
import GlassCard from './GlassCard';

interface SearchInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  editable?: boolean;
}

export default function SearchInput({
  value,
  onChangeText,
  placeholder = 'Search player...',
  editable = true,
}: SearchInputProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [focused, setFocused] = useState(false);

  return (
    <GlassCard style={focused ? styles.containerFocused : styles.container} intensity={30}>
      <View style={layout.inner}>
        <FontAwesome name="search" size={16} color={colors.textMuted} />
        <TextInput
          style={[styles.input, webInputReset]}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          editable={editable}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
    </GlassCard>
  );
}

const layout = StyleSheet.create({
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
});

// Web only: strip the browser's default focus outline on the underlying <input>.
// The themed container border (accent on focus) is the visible focus indicator.
const webInputReset: TextStyle | null =
  Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : null;

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: {
      borderWidth: 1,
      borderColor: c.border,
    },
    containerFocused: {
      borderWidth: 1,
      borderColor: c.accent,
    },
    input: {
      ...type.body,
      minHeight: 44,
      flex: 1,
      paddingHorizontal: spacing.sm,
      color: c.textPrimary,
    },
  });
