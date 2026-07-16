import AsyncStorage from '@react-native-async-storage/async-storage';

export interface RemoteConfig {
  maintenance_mode: boolean;
  disabled_modes: string[];
  message: string;
  /** Kill switch for the global leaderboard (identity, sync and UI).
   *  Optional so older cached configs stay parseable; missing means enabled. */
  leaderboardEnabled?: boolean;
  /** Kill switches for real club crest images (trademark exposure is managed
   *  server-side: images + manifest live on the CDN, never in the binary).
   *  Missing means OFF — the safe default for store review and stale caches.
   *  Split per platform so web can show crests while the store apps stay
   *  clean until legal clarity (owner decision 2026-07-16). */
  clubLogosWeb?: boolean;
  clubLogosNative?: boolean;
}

const DEFAULT_CONFIG: RemoteConfig = {
  maintenance_mode: false,
  disabled_modes: [],
  message: '',
  leaderboardEnabled: true,
  clubLogosWeb: false,
  clubLogosNative: false,
};

// Served via CloudFront (config bucket is private; OAC-only access).
const CONFIG_URL = 'https://d295hqf6csr5wz.cloudfront.net/config.json';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const STORAGE_KEY = 'remote-config-cache';

let cachedConfig: RemoteConfig | null = null;
let cachedAt = 0;

export async function fetchRemoteConfig(): Promise<RemoteConfig> {
  // Return in-memory cache if fresh
  const now = Date.now();
  if (cachedConfig && now - cachedAt < CACHE_TTL_MS) {
    return cachedConfig;
  }

  // Try persistent cache first (instant, no network)
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      cachedConfig = JSON.parse(stored);
      cachedAt = now;
      // Background refresh (don't await)
      refreshInBackground();
      return cachedConfig!;
    }
  } catch {}

  // First launch: must fetch
  return fetchFromNetwork();
}

async function refreshInBackground(): Promise<void> {
  try {
    const response = await fetch(CONFIG_URL);
    if (response.ok) {
      const data: RemoteConfig = await response.json();
      cachedConfig = data;
      cachedAt = Date.now();
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  } catch {}
}

async function fetchFromNetwork(): Promise<RemoteConfig> {
  try {
    const response = await fetch(CONFIG_URL);
    if (!response.ok) return DEFAULT_CONFIG;
    const data: RemoteConfig = await response.json();
    cachedConfig = data;
    cachedAt = Date.now();
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return data;
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function getDefaultConfig(): RemoteConfig {
  return { ...DEFAULT_CONFIG };
}
