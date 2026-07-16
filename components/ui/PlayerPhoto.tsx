import React, { useMemo, useState } from 'react';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';

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
 *  (the card background showed through); oversizing the layer pushes that
 *  soft fringe outside the visible circle so the fill reads as the photo
 *  simply extending outward. 1.45 with the proportional blur below keeps the
 *  fringe just outside the frame; the old 1.7 read as a jarring hyper-zoom
 *  behind the sharp copy (user feedback 2026-07-15). Implemented with
 *  negative insets, NOT a transform: iOS Safari lets transformed children
 *  escape a border-radius + overflow-hidden clip (the blurred square painted
 *  outside the circle). */
const FILL_SCALE = 1.45;

/** Fill blur grows with the frame: a fixed 18 turned small (40pt) slot
 *  portraits into a muddy smear; proportional keeps it an ambient glow. */
const fillBlur = (size: number) => Math.max(8, Math.round(size * 0.18));

/** iOS Safari also lets FILTERED (blurred) children paint outside a
 *  border-radius + overflow-hidden clip — the fill square leaked around the
 *  circle. A no-op alpha mask (fully opaque everywhere) forces WebKit to
 *  composite the subtree through the rounded clip; Chrome/Firefox render it
 *  unchanged. Web-only object so native StyleSheet validation never sees it. */
const webClipFix =
  Platform.OS === 'web'
    ? ({ WebkitMaskImage: '-webkit-radial-gradient(white, black)' } as const)
    : null;

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
    <View style={[styles.photoFrame, frame, webClipFix as never]}>
      {/* Blur-fill square (owner call 2026-07-15): non-square photos are never
          cropped. A blurred, zoomed copy of the SAME image fills the frame,
          and the sharp copy sits on top letterboxed (contain), so the whole
          player — face included — is always visible. Square photos cover the
          frame edge-to-edge and the fill layer is invisible behind them. */}
      <Image
        source={{ uri: photoUrl }}
        style={{
          position: 'absolute',
          top: (-size * (FILL_SCALE - 1)) / 2,
          left: (-size * (FILL_SCALE - 1)) / 2,
          width: size * FILL_SCALE,
          height: size * FILL_SCALE,
        }}
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
