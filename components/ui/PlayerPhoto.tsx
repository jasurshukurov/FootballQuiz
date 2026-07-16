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

/** Zoom on the blurred fill layer. CSS/native blurs feather the image's own
 *  edges into transparency, which read as a dark vignette inside the frame
 *  (the card background showed through); scaling the layer pushes that soft
 *  fringe outside the visible circle so the fill reads as the photo simply
 *  extending outward. */
const FILL_SCALE = 1.7;

/** Fill blur grows with the frame: a fixed 18 turned small (40pt) slot
 *  portraits into a muddy smear; proportional keeps it an ambient glow. */
const fillBlur = (size: number) => Math.max(6, Math.round(size * 0.14));

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
      {/* Blur-fill square (owner call 2026-07-15): non-square photos are never
          cropped. A blurred, zoomed copy of the SAME image fills the frame,
          and the sharp copy sits on top letterboxed (contain), so the whole
          player — face included — is always visible. Square photos cover the
          frame edge-to-edge and the fill layer is invisible behind them. */}
      <Image
        source={{ uri: photoUrl }}
        style={[StyleSheet.absoluteFill, { transform: [{ scale: FILL_SCALE }] }]}
        resizeMode="cover"
        blurRadius={blur + fillBlur(size)}
      />
      <Image
        source={{ uri: photoUrl }}
        style={{ width: size, height: size }}
        resizeMode="contain"
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
