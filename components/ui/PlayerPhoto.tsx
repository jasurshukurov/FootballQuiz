import React, { useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { borderRadius } from '@/constants/theme';
import { ThemeColors } from '@/constants/themes';
import { useTheme } from '@/hooks/useTheme';
import { getPlayerPhoto } from '@/lib/playerPhotos';

interface PlayerPhotoProps {
  /** players_db id; no photo (or a load failure) falls back to initials. */
  playerId?: string | number | null;
  /** Explicit image URL — wins over the playerId lookup (Career Path photos
   *  live in career_paths.json, a different id space). */
  url?: string | null;
  /** Player name — drives the initials fallback. */
  name: string;
  size: number;
  /** Blur strength for the Who Are Ya photo clue (0 = sharp). */
  blur?: number;
}

/** Wikimedia sports photos are often full-body action shots with the face in
 *  the top fifth. The image is rendered taller than the circular frame and
 *  top-anchored, so the visible circle favors the head instead of the torso
 *  a center crop lands on. Headshots lose a sliver of chin at worst. */
const CROP_HEIGHT_FACTOR = 1.4;

/**
 * Circular player portrait with a same-footprint initials fallback, so
 * layouts never shift when a player has no licensed photo or the fetch
 * fails offline. Attribution: prominent placements pair this with the
 * photo's credit line; every photo is also listed on More -> Photo Credits.
 */
export default function PlayerPhoto({ playerId, url, name, size, blur = 0 }: PlayerPhotoProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [failed, setFailed] = useState(false);

  const photoUrl = url || getPlayerPhoto(playerId)?.url;

  const initials = useMemo(
    () =>
      name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? '')
        .join(''),
    [name],
  );

  const frame = {
    width: size,
    height: size,
    borderRadius: borderRadius.full,
  };

  if (!photoUrl || failed) {
    return (
      <View style={[styles.fallback, frame]}>
        {/* fontSize scales off the size prop — crest-style geometry, not type scale. */}
        <Text style={[styles.initials, { fontSize: size * 0.36 }]} allowFontScaling={false}>
          {initials}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.photoFrame, frame]}>
      <Image
        source={{ uri: photoUrl }}
        style={{ width: size, height: size * CROP_HEIGHT_FACTOR }}
        resizeMode="cover"
        blurRadius={blur}
        onError={() => setFailed(true)}
        accessibilityLabel={blur > 0 ? 'Blurred player photo' : `${name} photo`}
      />
    </View>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    fallback: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.accentSoft,
      borderWidth: 1,
      borderColor: c.border,
    },
    initials: {
      color: c.accent,
      fontWeight: '700',
    },
    photoFrame: {
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: c.borderStrong,
      backgroundColor: c.bgCard,
    },
  });
