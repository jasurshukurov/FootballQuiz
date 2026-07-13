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

import { Player } from '@/types/player';
import { useDebounce } from '@/hooks/useDebounce';
import { colors, fonts, spacing, borderRadius } from '@/constants/theme';

interface PlayerSearchAutocompleteProps {
  players: Player[];
  onSelectPlayer: (player: Player) => void;
  excludeIds?: Set<number>;
  placeholder?: string;
  maxResults?: number;
  disabled?: boolean;
  autoFocus?: boolean;
  dropDirection?: 'down' | 'up';
}

function PlayerSearchAutocomplete({
  players,
  onSelectPlayer,
  excludeIds,
  placeholder = 'Search player...',
  maxResults = 8,
  disabled = false,
  autoFocus = false,
  dropDirection = 'down',
}: PlayerSearchAutocompleteProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<TextInput>(null);
  const debouncedQuery = useDebounce(query, 250);

  const fuse = useMemo(
    () =>
      new Fuse(players, {
        keys: ['name', 'normalized_name'],
        threshold: 0.4,
        distance: 100,
        minMatchCharLength: 2,
        ignoreLocation: true,
      }),
    [players],
  );

  const results = useMemo(() => {
    if (debouncedQuery.length < 2) return [];
    const fuseResults = fuse.search(debouncedQuery, {
      limit: maxResults + (excludeIds?.size ?? 0),
    });
    const filtered = excludeIds
      ? fuseResults.filter((r) => !excludeIds.has(r.item.id))
      : fuseResults;
    return filtered.slice(0, maxResults).map((r) => r.item);
  }, [debouncedQuery, fuse, maxResults, excludeIds]);

  const showDropdown = debouncedQuery.length >= 2;
  const showNoResults = showDropdown && results.length === 0;

  const handleSelect = useCallback(
    (player: Player) => {
      onSelectPlayer(player);
      setQuery('');
      Keyboard.dismiss();
    },
    [onSelectPlayer],
  );

  const handleClear = useCallback(() => {
    setQuery('');
    inputRef.current?.focus();
  }, []);

  const handleSubmitEditing = useCallback(() => {
    // No-op: Return/Enter must not trigger any action
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: Player }) => (
      <Pressable
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        onPress={() => handleSelect(item)}>
        <Text style={styles.playerName}>{item.name}</Text>
        <Text style={styles.playerTeam}>{item.current_team}</Text>
      </Pressable>
    ),
    [handleSelect],
  );

  const keyExtractor = useCallback((item: Player) => String(item.id), []);

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
          editable={!disabled}
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

export default React.memo(PlayerSearchAutocomplete);

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
    flexDirection: 'column',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.glassBorder,
  },
  rowPressed: {
    backgroundColor: colors.glassHighlight,
  },
  playerName: {
    fontSize: 15,
    color: colors.chalkWhite,
    fontFamily: fonts.body,
  },
  playerTeam: {
    fontSize: 12,
    color: colors.steelGray,
    fontFamily: fonts.body,
    marginTop: 2,
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
