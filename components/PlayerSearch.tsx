import React, { useState, useCallback, useMemo } from 'react';
import { TextInput, StyleSheet, Pressable } from 'react-native';
import { FlashList } from '@shopify/flash-list';

import { Text, View } from '@/components/Themed';
import { Player } from '@/types/player';
import { searchPlayers } from '@/lib/playerData';

interface PlayerSearchProps {
  onSelectPlayer: (player: Player) => void;
  excludeIds?: number[];
  placeholder?: string;
}

export function PlayerSearch({
  onSelectPlayer,
  excludeIds = [],
  placeholder = 'Search for a player...',
}: PlayerSearchProps) {
  const [query, setQuery] = useState('');

  const excludeSet = useMemo(() => new Set(excludeIds), [excludeIds]);

  const results = useMemo(() => {
    if (query.length < 2) return [];
    return searchPlayers(query, 30).filter((p) => !excludeSet.has(p.id));
  }, [query, excludeSet]);

  const handleSelect = useCallback(
    (player: Player) => {
      onSelectPlayer(player);
      setQuery('');
    },
    [onSelectPlayer],
  );

  const renderItem = useCallback(
    ({ item }: { item: Player }) => (
      <Pressable style={styles.item} onPress={() => handleSelect(item)}>
        <Text style={styles.playerName}>{item.name}</Text>
        <Text style={styles.playerTeam}>{item.current_team}</Text>
      </Pressable>
    ),
    [handleSelect],
  );

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={query}
        onChangeText={setQuery}
        placeholder={placeholder}
        placeholderTextColor="#999"
        autoCapitalize="none"
        autoCorrect={false}
      />
      {results.length > 0 && (
        <View style={styles.listContainer}>
          <FlashList
            data={results}
            renderItem={renderItem}
            keyExtractor={(item) => String(item.id)}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#fff',
  },
  listContainer: {
    maxHeight: 300,
    borderWidth: 1,
    borderColor: '#ccc',
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    backgroundColor: '#fff',
  },
  item: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  playerTeam: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
});
