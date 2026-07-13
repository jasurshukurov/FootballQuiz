import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/constants/theme';

/** Small pill shown on a game screen when it's being played in practice/archive
 *  mode (a past day), so the user knows it doesn't affect their streak. */
export default function PracticePill({ date }: { date: string }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.text}>{`PRACTICE — ${date}`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'center',
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: colors.cardYellow,
    backgroundColor: 'rgba(244,162,97,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 8,
  },
  text: {
    fontSize: 12,
    fontFamily: fonts.subheading,
    color: colors.cardYellow,
    letterSpacing: 1.5,
  },
});
