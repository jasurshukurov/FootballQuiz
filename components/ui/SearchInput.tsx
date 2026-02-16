import React from 'react';
import { TextInput, View, StyleSheet } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { colors } from '@/constants/theme';
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
  return (
    <GlassCard style={styles.container} intensity={30}>
      <View style={styles.inner}>
        <FontAwesome name="search" size={16} color={colors.steelGray} />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.steelGray}
          editable={editable}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 2,
    borderColor: `rgba(5,242,108,0.4)`,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  input: {
    minHeight: 44,
    flex: 1,
    paddingHorizontal: 8,
    fontSize: 16,
    color: colors.chalkWhite,
  },
});
