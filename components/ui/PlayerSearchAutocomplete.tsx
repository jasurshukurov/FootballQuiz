import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
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

import { Player } from '@/types/player';
import Tappable from '@/components/ui/Tappable';
import { createPlayerSearchEngine, PlayerSearchOptions } from '@/lib/playerSearch';
import { shortenClubName } from '@/lib/clubNames';
import { useDebounce } from '@/hooks/useDebounce';
import { spacing, borderRadius, type } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';

export interface PlayerSearchAutocompleteHandle {
  /** Clear the query (and hide the dropdown). */
  clear: () => void;
  focus: () => void;
}

interface PlayerSearchAutocompleteProps {
  players: Player[];
  onSelectPlayer: (player: Player) => void;
  excludeIds?: Set<number>;
  /** Game-specific eligibility applied on top of the text ranking. */
  filter?: (player: Player) => boolean;
  /** Fires on every query edit (including internal clears) — lets a screen keep
   *  a raw-text submit path (Top Lists' GUESS button) alongside the dropdown. */
  onQueryChange?: (text: string) => void;
  placeholder?: string;
  maxResults?: number;
  disabled?: boolean;
  autoFocus?: boolean;
  dropDirection?: 'down' | 'up';
}

/**
 * THE player search box (Career Path UX): type-ahead dropdown ranked by the
 * shared fame-blended engine in lib/playerSearch — accuracy buckets first,
 * fame as the tiebreak inside each bucket.
 */
const PlayerSearchAutocomplete = forwardRef<
  PlayerSearchAutocompleteHandle,
  PlayerSearchAutocompleteProps
>(function PlayerSearchAutocomplete(
  {
    players,
    onSelectPlayer,
    excludeIds,
    filter,
    onQueryChange,
    placeholder = 'Search player...',
    maxResults = 8,
    disabled = false,
    autoFocus = false,
    dropDirection = 'down',
  },
  ref,
) {
  const theme = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const debouncedQuery = useDebounce(query, 200);

  const engine = useMemo(() => createPlayerSearchEngine(players), [players]);

  const searchOpts = useMemo<PlayerSearchOptions>(() => {
    const eligible =
      excludeIds || filter
        ? (p: Player) => !(excludeIds?.has(p.id) ?? false) && (filter ? filter(p) : true)
        : undefined;
    return { limit: maxResults, filter: eligible };
  }, [excludeIds, filter, maxResults]);

  const results = useMemo(() => {
    if (debouncedQuery.length < 2) return [];
    return engine.search(debouncedQuery, searchOpts);
  }, [debouncedQuery, engine, searchOpts]);

  const showDropdown = debouncedQuery.length >= 2;
  const showNoResults = showDropdown && results.length === 0;

  const updateQuery = useCallback(
    (text: string) => {
      setQuery(text);
      onQueryChange?.(text);
    },
    [onQueryChange],
  );

  useImperativeHandle(
    ref,
    () => ({
      clear: () => updateQuery(''),
      focus: () => inputRef.current?.focus(),
    }),
    [updateQuery],
  );

  const handleSelect = useCallback(
    (player: Player) => {
      onSelectPlayer(player);
      updateQuery('');
      Keyboard.dismiss();
    },
    [onSelectPlayer, updateQuery],
  );

  const handleClear = useCallback(() => {
    updateQuery('');
    inputRef.current?.focus();
  }, [updateQuery]);

  const handleSubmitEditing = useCallback(() => {
    // Web keyboard flow: Enter picks the top-ranked result. On native the
    // return key stays inert (selection is always an explicit tap).
    if (Platform.OS !== 'web') return;
    const q = query.trim();
    if (q.length < 2) return;
    const top = engine.search(q, searchOpts)[0];
    if (top) handleSelect(top);
  }, [query, engine, searchOpts, handleSelect]);

  const renderItem = useCallback(
    ({ item }: { item: Player }) => (
      <Tappable
        onPress={() => handleSelect(item)}
        haptic="none"
        hitSlop={0}
        hoverStyle={{ backgroundColor: colors.bgCardPressed }}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
        <Text style={styles.playerName}>{item.name}</Text>
        {item.current_team ? (
          <Text style={styles.playerTeam}>{shortenClubName(item.current_team)}</Text>
        ) : null}
      </Tappable>
    ),
    [handleSelect, styles, colors],
  );

  const keyExtractor = useCallback((item: Player) => String(item.id), []);

  const isUp = dropDirection === 'up';

  return (
    <View style={layout.wrapper}>
      <View style={[styles.inputContainer, focused && styles.inputContainerFocused]}>
        <FontAwesome name="search" size={16} color={colors.textMuted} style={layout.searchIcon} />
        <TextInput
          ref={inputRef}
          style={[styles.input, webInputReset]}
          value={query}
          onChangeText={updateQuery}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          editable={!disabled}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus={autoFocus}
          blurOnSubmit={false}
          onSubmitEditing={handleSubmitEditing}
          returnKeyType={Platform.OS === 'web' ? 'search' : 'none'}
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
});

export default React.memo(PlayerSearchAutocomplete);

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
      flexDirection: 'column',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    rowPressed: {
      backgroundColor: c.accentSoft,
    },
    playerName: {
      ...type.bodyBold,
      color: c.textPrimary,
    },
    playerTeam: {
      ...type.caption,
      color: c.textSecondary,
      marginTop: 2,
    },
    noResultsText: {
      ...type.body,
      color: c.textMuted,
    },
  });
