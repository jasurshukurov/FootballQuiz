import AsyncStorage from '@react-native-async-storage/async-storage';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const CLOUDFRONT_DOMAIN = 'https://d1example.cloudfront.net';
const PUZZLE_URL = `${CLOUDFRONT_DOMAIN}/puzzles/latest.json`;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const STORAGE_KEY_PREFIX = 'daily-puzzle-';

// ---------------------------------------------------------------------------
// Compressed format interfaces (wire format from S3)
// ---------------------------------------------------------------------------

export interface CompressedPuzzle {
  _v: number;
  _keys: Record<string, string>;
  _nat: Record<string, string>;
  _lg: Record<string, string>;
  _pos: Record<string, string>;
  _imgBase?: string;
  date: string;
  seed: number;
  modes: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Decompressed format interfaces (used by the app)
// ---------------------------------------------------------------------------

export interface DecompressedPuzzle {
  date: string;
  seed: number;
  modes: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// In-memory cache
// ---------------------------------------------------------------------------

let cachedPuzzle: DecompressedPuzzle | null = null;
let cachedAt = 0;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch today's daily puzzle. Serves from cache first, refreshes in background.
 * Returns null if offline and no cache is available.
 */
export async function fetchDailyPuzzle(): Promise<DecompressedPuzzle | null> {
  const now = Date.now();

  // Return in-memory cache if fresh
  if (cachedPuzzle && now - cachedAt < CACHE_TTL_MS) {
    return cachedPuzzle;
  }

  // Try persistent cache (instant, no network)
  const today = getDailyPuzzleDate();
  const storageKey = STORAGE_KEY_PREFIX + today;

  try {
    const stored = await AsyncStorage.getItem(storageKey);
    if (stored) {
      cachedPuzzle = JSON.parse(stored) as DecompressedPuzzle;
      cachedAt = now;
      // Background refresh (don't await)
      refreshInBackground(storageKey);
      return cachedPuzzle;
    }
  } catch {
    // Cache read failed, continue to network
  }

  // First launch or new day: must fetch
  return fetchFromNetwork(storageKey);
}

/**
 * Decompress a compressed puzzle payload into the full format used by the app.
 */
export function decompressPuzzle(compressed: CompressedPuzzle): DecompressedPuzzle {
  const keyMap = compressed._keys;
  const natMap = compressed._nat;
  const lgMap = compressed._lg;
  const posMap = compressed._pos;
  const imgBase = compressed._imgBase ?? '';

  function expandValue(key: string, value: unknown): unknown {
    if (typeof value === 'string') {
      // Expand nationality codes
      if (key === 'nat' && natMap[value]) {
        return natMap[value];
      }
      // Expand league codes
      if ((key === 'league' || key === 'comp') && lgMap[value]) {
        return lgMap[value];
      }
      // Expand position codes
      if (key === 'pos' && posMap[value]) {
        return posMap[value];
      }
      // Expand position in grid column "value" field
      if (key === 'value' && posMap[value]) {
        return posMap[value];
      }
      // Expand image URLs
      if ((key === 'img' || key === 'image_url') && value && !value.startsWith('http') && imgBase) {
        return imgBase + value;
      }
      // Expand market values ("150M" -> 150000000, "5K" -> 5000)
      if (key === 'mv') {
        return expandMarketValue(value);
      }
    }
    return value;
  }

  function expandMarketValue(val: string): number {
    const upper = val.toUpperCase();
    if (upper.endsWith('M')) {
      return parseFloat(upper.slice(0, -1)) * 1_000_000;
    }
    if (upper.endsWith('K')) {
      return parseFloat(upper.slice(0, -1)) * 1_000;
    }
    return parseFloat(val) || 0;
  }

  function expandObject(obj: unknown): unknown {
    if (obj === null || obj === undefined) return obj;

    if (Array.isArray(obj)) {
      return obj.map((item) => expandObject(item));
    }

    if (typeof obj === 'object') {
      const result: Record<string, unknown> = {};
      for (const [shortKey, value] of Object.entries(obj as Record<string, unknown>)) {
        // Expand short keys to full names
        const fullKey = keyMap[shortKey] ?? shortKey;
        const expanded = expandValue(fullKey, value);
        result[fullKey] =
          typeof expanded === 'object' && expanded !== null ? expandObject(expanded) : expanded;
      }
      return result;
    }

    return obj;
  }

  const expandedModes = expandObject(compressed.modes) as Record<string, unknown>;

  return {
    date: compressed.date,
    seed: compressed.seed,
    modes: expandedModes,
  };
}

/**
 * Get today's date in YYYY-MM-DD format (used as puzzle date key).
 */
export function getDailyPuzzleDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function refreshInBackground(storageKey: string): Promise<void> {
  try {
    const response = await fetch(PUZZLE_URL);
    if (response.ok) {
      const compressed: CompressedPuzzle = await response.json();
      const decompressed = decompressPuzzle(compressed);
      cachedPuzzle = decompressed;
      cachedAt = Date.now();
      await AsyncStorage.setItem(storageKey, JSON.stringify(decompressed));
    }
  } catch {
    // Background refresh failed silently
  }
}

async function fetchFromNetwork(storageKey: string): Promise<DecompressedPuzzle | null> {
  try {
    const response = await fetch(PUZZLE_URL);
    if (!response.ok) return null;
    const compressed: CompressedPuzzle = await response.json();
    const decompressed = decompressPuzzle(compressed);
    cachedPuzzle = decompressed;
    cachedAt = Date.now();
    await AsyncStorage.setItem(storageKey, JSON.stringify(decompressed));
    return decompressed;
  } catch {
    return null;
  }
}
