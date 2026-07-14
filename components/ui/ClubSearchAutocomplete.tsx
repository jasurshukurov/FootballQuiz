import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Keyboard,
  Platform,
  FlatList,
  TextStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Fuse from 'fuse.js';

import TeamCrest from '@/components/ui/TeamCrest';
import Tappable from '@/components/ui/Tappable';
import { shortenClubName } from '@/lib/clubNames';
import { useDebounce } from '@/hooks/useDebounce';
import { spacing, borderRadius, type } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';

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
  const theme = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
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
      <Tappable
        onPress={() => handleSelect(item)}
        haptic="none"
        hitSlop={0}
        hoverStyle={{ backgroundColor: colors.bgCardPressed }}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
        <TeamCrest teamName={item.name} size={20} />
        {/* Display-only shortening — selection still passes the stored name. */}
        <Text style={styles.clubName}>{shortenClubName(item.name)}</Text>
      </Tappable>
    ),
    [handleSelect, styles, colors],
  );

  const keyExtractor = useCallback((item: ClubItem) => item.name, []);

  const isUp = dropDirection === 'up';

  return (
    <View style={layout.wrapper}>
      <View style={[styles.inputContainer, focused && styles.inputContainerFocused]}>
        <FontAwesome name="search" size={16} color={colors.textMuted} style={layout.searchIcon} />
        <TextInput
          ref={inputRef}
          style={[styles.input, webInputReset]}
          value={query}
          onChangeText={setQuery}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus={autoFocus}
          blurOnSubmit={false}
          onSubmitEditing={handleSubmitEditing}
          returnKeyType="none"
        />
        {query.length > 0 && (
          <Tappable onPress={handleClear} haptic="none" accessibilityLabel="Clear search">
            <FontAwesome name="times-circle" size={18} color={colors.textMuted} />
          </Tappable>
        )}
      </View>

      {showDropdown && (
        <View style={[styles.dropdown, isUp ? layout.dropdownUp : layout.dropdownDown]}>
          <View style={styles.dropdownBg} />
          {Platform.OS !== 'web' ? (
            <BlurView
              intensity={40}
              tint={theme.dark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
          ) : null}
          {showNoResults ? (
            <View style={layout.noResults}>
              <Text style={styles.noResultsText}>No results found</Text>
            </View>
          ) : (
            <FlatList
              data={results}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              keyboardShouldPersistTaps="handled"
              style={layout.list}
              nestedScrollEnabled
            />
          )}
        </View>
      )}
    </View>
  );
}

export default React.memo(ClubSearchAutocomplete);

const layout = StyleSheet.create({
  wrapper: {
    position: 'relative',
    zIndex: 100,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  dropdownDown: {
    top: '100%',
    marginTop: spacing.xs,
  },
  dropdownUp: {
    bottom: '100%',
    marginBottom: spacing.xs,
  },
  list: {
    maxHeight: 296,
  },
  noResults: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
});

// Web only: strip the browser's default focus outline on the underlying <input>.
// The themed container border (accent on focus) is the visible focus indicator.
const webInputReset: TextStyle | null =
  Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : null;

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: borderRadius.xl,
      backgroundColor: c.bgElevated,
      zIndex: 101,
    },
    inputContainerFocused: {
      borderColor: c.accent,
    },
    input: {
      ...type.body,
      flex: 1,
      minHeight: 44,
      color: c.textPrimary,
    },
    dropdown: {
      position: 'absolute',
      left: 0,
      right: 0,
      zIndex: 100,
      maxHeight: 300,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: borderRadius.lg,
      overflow: 'hidden',
    },
    dropdownBg: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: c.bgElevated,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      gap: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    rowPressed: {
      backgroundColor: c.accentSoft,
    },
    clubName: {
      ...type.bodyBold,
      color: c.textPrimary,
    },
    noResultsText: {
      ...type.body,
      color: c.textMuted,
    },
  });
