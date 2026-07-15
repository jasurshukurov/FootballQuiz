// Attribution for Career Path player photos (Wikimedia Commons). CC BY /
// CC BY-SA images legally require artist + license credit wherever the photo
// is shown; CC0/public-domain entries need none. Built by
// scripts/etl/swap_career_photos.py into data/career_photo_credits.json.

interface PhotoCreditEntry {
  artist: string;
  license: string;
  license_url: string;
  needs_attribution: boolean;
}

const creditsJson = require('@/data/career_photo_credits.json') as Record<string, PhotoCreditEntry>;

export interface PhotoCredit {
  /** e.g. "Photo: Дмитрий Садовников · CC BY-SA 3.0" */
  label: string;
  /** License deed URL, opened when the credit line is tapped. */
  url: string;
}

/** Credit line for a career_paths player id, or null when the photo needs no
 *  attribution (CC0/public domain) or the player has no photo. */
export function getPhotoCredit(playerId: string | number | undefined): PhotoCredit | null {
  if (playerId === undefined || playerId === null) return null;
  const entry = creditsJson[String(playerId)];
  if (!entry || !entry.needs_attribution) return null;
  return {
    label: `Photo: ${entry.artist} · ${entry.license.toUpperCase()}`,
    url: entry.license_url,
  };
}
