import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  Keyboard,
  Platform,
  FlatList,
} from 'react-native';
import { BlurView } from 'expo-blur';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Fuse from 'fuse.js';

import TeamCrest from '@/components/ui/TeamCrest';
import { useDebounce } from '@/hooks/useDebounce';
import { colors, fonts, spacing, borderRadius } from '@/constants/theme';

interface ClubItem {
  name: string;
  normalizedName: string;
}

interface ClubSearchAutocompleteProps {
  clubs: ClubItem[];
  onSelectClub: (clubName: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  dropDirection?: 'down' | 'up';
}

function ClubSearchAutocomplete({
  clubs,
  onSelectClub,
  placeholder = 'Search club...',
  autoFocus = false,
  dropDirection = 'down',
}: ClubSearchAutocompleteProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<TextInput>(null);
  const debouncedQuery = useDebounce(query, 250);

  const fuse = useMemo(
    () =>
      new Fuse(clubs, {
        keys: ['name', 'normalizedName'],
        threshold: 0.4,
        distance: 100,
        minMatchCharLength: 2,
        ignoreLocation: true,
      }),
    [clubs],
  );

  const results = useMemo(() => {
    if (debouncedQuery.length < 2) return [];
    return fuse.search(debouncedQuery, { limit: 8 }).map((r) => r.item);
  }, [debouncedQuery, fuse]);

  const showDropdown = debouncedQuery.length >= 2;
  const showNoResults = showDropdown && results.length === 0;

  const handleSelect = useCallback(
    (club: ClubItem) => {
      onSelectClub(club.name);
      setQuery('');
      Keyboard.dismiss();
    },
    [onSelectClub],
  );

  const handleClear = useCallback(() => {
    setQuery('');
    inputRef.current?.focus();
  }, []);

  const handleSubmitEditing = useCallback(() => {
    // No-op: Return/Enter must not trigger any action
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: ClubItem }) => (
      <Pressable
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        onPress={() => handleSelect(item)}>
        <TeamCrest teamName={item.name} size={20} />
        <Text style={styles.clubName}>{item.name}</Text>
      </Pressable>
    ),
    [handleSelect],
  );

  const keyExtractor = useCallback((item: ClubItem) => item.name, []);

  const isUp = dropDirection === 'up';

  return (
    <View style={styles.wrapper}>
      <View style={styles.inputContainer}>
        <FontAwesome name="search" size={16} color={colors.steelGray} style={styles.searchIcon} />
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder={placeholder}
          placeholderTextColor={colors.steelGray}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus={autoFocus}
          blurOnSubmit={false}
          onSubmitEditing={handleSubmitEditing}
          returnKeyType="none"
        />
        {query.length > 0 && (
          <Pressable onPress={handleClear} hitSlop={8}>
            <FontAwesome name="times-circle" size={18} color={colors.steelGray} />
          </Pressable>
        )}
      </View>

      {showDropdown && (
        <View style={[styles.dropdown, isUp ? styles.dropdownUp : styles.dropdownDown]}>
          <View style={styles.dropdownBg} />
          {Platform.OS !== 'web' ? (
            <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
          ) : null}
          {showNoResults ? (
            <View style={styles.noResults}>
              <Text style={styles.noResultsText}>No results found</Text>
            </View>
          ) : (
            <FlatList
              data={results}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              keyboardShouldPersistTaps="handled"
              style={styles.list}
              nestedScrollEnabled
            />
          )}
        </View>
      )}
    </View>
  );
}

export default React.memo(ClubSearchAutocomplete);

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    zIndex: 100,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderWidth: 2,
    borderColor: colors.neonGlow,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.retroBlack,
    zIndex: 101,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 44,
    fontSize: 16,
    color: colors.chalkWhite,
    fontFamily: fonts.body,
  },
  dropdown: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 100,
    maxHeight: 300,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  dropdownDown: {
    top: '100%',
    marginTop: spacing.xs,
  },
  dropdownUp: {
    bottom: '100%',
    marginBottom: spacing.xs,
  },
  dropdownBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,10,26,0.95)',
  },
  list: {
    maxHeight: 296,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.glassBorder,
  },
  rowPressed: {
    backgroundColor: colors.glassHighlight,
  },
  clubName: {
    fontSize: 15,
    color: colors.chalkWhite,
    fontFamily: fonts.body,
  },
  noResults: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 14,
    color: colors.steelGray,
    fontFamily: fonts.body,
  },
});
