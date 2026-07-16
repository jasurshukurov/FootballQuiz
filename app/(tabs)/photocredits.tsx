import React, { useMemo } from 'react';
import { FlatList, Linking, StyleSheet, Text, View } from 'react-native';

import Screen from '@/components/ui/Screen';
import ScreenHeader from '@/components/ui/ScreenHeader';
import Tappable from '@/components/ui/Tappable';
import { spacing, borderRadius, type } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';
import { getAllPhotoCredits } from '@/lib/playerPhotos';

interface CreditRow {
  key: string;
  artist: string;
  license: string;
  licenseUrl: string;
  count: number;
}

/** Photographer + license aggregation of every player photo the app can
 *  show — the attribution surface for the small in-game portraits (CC BY /
 *  CC BY-SA require credit; CC0/public-domain entries are listed for
 *  completeness). Prominent placements ALSO credit inline next to the photo. */
function buildRows(): CreditRow[] {
  const byArtist = new Map<string, CreditRow>();
  for (const c of getAllPhotoCredits()) {
    const key = `${c.artist}|${c.license}`;
    const row = byArtist.get(key);
    if (row) {
      row.count += 1;
    } else {
      byArtist.set(key, {
        key,
        artist: c.artist || 'Unknown photographer',
        license: c.license.toUpperCase(),
        licenseUrl: c.licenseUrl,
        count: 1,
      });
    }
  }
  return [...byArtist.values()].sort((a, b) => b.count - a.count);
}

export default function PhotoCreditsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const rows = useMemo(buildRows, []);
  const total = useMemo(() => rows.reduce((n, r) => n + r.count, 0), [rows]);

  return (
    <Screen scroll={false}>
      <ScreenHeader
        title="Credits & Trademarks"
        subtitle={`${total} player photos via Wikimedia Commons`}
      />
      <Text style={styles.intro}>
        Player portraits are sourced from Wikimedia Commons under Creative Commons and public domain
        licenses. Thanks to every photographer below. Tap a row to view the license.
      </Text>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.key}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListFooterComponent={
          <View style={styles.trademarkBlock}>
            <Text style={styles.trademarkTitle}>Club names and badges</Text>
            <Text style={styles.trademarkText}>
              Football Trivia is an unofficial fan-made game. It is not affiliated with, endorsed
              by, or sponsored by any football club, league, or governing body. All club names,
              badges, and trademarks are the property of their respective owners and appear solely
              to identify the clubs in quiz questions. If you are a rights holder and would like any
              content reviewed or removed, contact support@footballtrivia.app and we will act
              promptly.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Tappable
            onPress={() => {
              if (item.licenseUrl) Linking.openURL(item.licenseUrl).catch(() => {});
            }}
            accessibilityLabel={`${item.artist}, ${item.license}`}
            hoverStyle={{ backgroundColor: colors.bgCardPressed }}
            style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.artist} numberOfLines={1}>
                {item.artist}
              </Text>
              <Text style={styles.meta}>
                {item.license} · {item.count} photo{item.count !== 1 ? 's' : ''}
              </Text>
            </View>
          </Tappable>
        )}
      />
    </Screen>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    intro: {
      ...type.caption,
      color: c.textSecondary,
      marginBottom: spacing.md,
    },
    listContent: {
      paddingBottom: spacing.xxl,
    },
    trademarkBlock: {
      marginTop: spacing.lg,
      paddingTop: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
      gap: spacing.xs,
    },
    trademarkTitle: {
      ...type.captionBold,
      color: c.textPrimary,
    },
    trademarkText: {
      ...type.micro,
      color: c.textMuted,
      lineHeight: 16,
    },
    row: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: borderRadius.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    rowText: {
      gap: 1,
    },
    artist: {
      ...type.bodyBold,
      color: c.textPrimary,
    },
    meta: {
      ...type.micro,
      color: c.textMuted,
    },
  });
