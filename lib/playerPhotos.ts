// App-wide player photo lookup (Wikimedia Commons, license-allowlisted).
// Built by scripts/etl/build_player_photos.py from image_attributions.json;
// keyed by players_db id. CC BY / CC BY-SA photos legally require credit:
// prominent placements render an inline line (PhotoCredit), and every photo
// is also listed on the More -> Photo Credits screen.

import { PhotoCredit } from '@/lib/photoCredits';

const PREFIX = 'https://upload.wikimedia.org/wikipedia/commons/';

interface PhotoMap {
  /** [license label, deed url] — url empty for public-domain style entries. */
  licenses: [string, string][];
  /** players_db id -> [url or commons suffix, artist, license index]. */
  photos: Record<string, [string, string, number]>;
}

const map = require('@/data/player_photos.json') as PhotoMap;

const NO_CREDIT_NEEDED = /^(cc0|public domain|pd)$/;

export interface PlayerPhoto {
  url: string;
  /** null when the license needs no attribution (CC0/public domain). */
  credit: PhotoCredit | null;
  licenseLabel: string;
  artist: string;
}

/** Photo for a players_db id, or null if we have no licensed image. */
export function getPlayerPhoto(playerId: string | number | undefined | null): PlayerPhoto | null {
  if (playerId === undefined || playerId === null) return null;
  const row = map.photos[String(playerId)];
  if (!row) return null;
  const [rawUrl, artist, licIdx] = row;
  const [license, licenseUrl] = map.licenses[licIdx] ?? ['', ''];
  const url = rawUrl.startsWith('http') ? rawUrl : PREFIX + rawUrl;
  const credit = NO_CREDIT_NEEDED.test(license)
    ? null
    : { label: `Photo: ${artist} · ${license.toUpperCase()}`, url: licenseUrl };
  return { url, credit, licenseLabel: license, artist };
}

/** Every photo entry, for the Photo Credits screen. */
export function getAllPhotoCredits(): {
  id: string;
  artist: string;
  license: string;
  licenseUrl: string;
}[] {
  return Object.entries(map.photos).map(([id, [, artist, licIdx]]) => {
    const [license, licenseUrl] = map.licenses[licIdx] ?? ['', ''];
    return { id, artist, license, licenseUrl };
  });
}
