import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { create } from 'zustand';

import { useRemoteConfigStore } from '@/hooks/useRemoteConfigStore';

/**
 * Real club crest images — SERVER-SIDE ONLY by design.
 *
 * Nothing here ships in the binary: the crest files and the name→file
 * manifest both live on the CDN, and display is gated by the per-platform
 * remote-config kill switches (clubLogosWeb / clubLogosNative). Turning a
 * switch off — or deleting one file from S3 after a takedown request —
 * changes what every installed client shows without an app release.
 * Missing config means OFF, so store-review builds and offline first
 * launches never render a crest.
 */

const LOGO_ORIGIN = 'https://footballtrivia.app';
/** Same-origin on production web (no CORS in the path at all); absolute from
 *  native and from dev servers. */
function manifestUrl(): string {
  if (
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    window.location?.origin === LOGO_ORIGIN
  ) {
    return '/club-logos/manifest.json';
  }
  return `${LOGO_ORIGIN}/club-logos/manifest.json`;
}
const STORAGE_KEY = 'club-logos-manifest-cache';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // manifest is takedown surface: refresh daily

interface LogoManifest {
  version: number;
  /** Path prefix on the CDN, e.g. "/club-logos/". */
  base: string;
  /** Exact club-name/alias string → file name. Plain lookup, no fuzzing. */
  clubs: Record<string, string>;
}

interface ClubLogoState {
  manifest: LogoManifest | null;
  setManifest: (m: LogoManifest) => void;
}

const useClubLogoStore = create<ClubLogoState>((set) => ({
  manifest: null,
  setManifest: (manifest) => set({ manifest }),
}));

let loadStarted = false;

async function loadManifest(): Promise<void> {
  if (loadStarted) return;
  loadStarted = true;

  // Cached copy first: instant crests on repeat launches, offline included.
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      const { at, manifest } = JSON.parse(stored);
      if (manifest?.clubs) {
        useClubLogoStore.getState().setManifest(manifest);
        if (Date.now() - at < CACHE_TTL_MS) return;
      }
    }
  } catch {}

  try {
    const response = await fetch(manifestUrl());
    if (!response.ok) return;
    const manifest: LogoManifest = await response.json();
    if (!manifest?.clubs) return;
    useClubLogoStore.getState().setManifest(manifest);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ at: Date.now(), manifest }));
  } catch {
    // Offline / CDN hiccup: callers keep rendering the generic shield.
  }
}

/** Whether the current platform's crest kill switch is on. Non-hook. */
export function clubLogosEnabled(): boolean {
  const config = useRemoteConfigStore.getState().config;
  return Platform.OS === 'web' ? !!config.clubLogosWeb : !!config.clubLogosNative;
}

/**
 * URL of the real crest for a club-name string, or null (switch off, manifest
 * not loaded yet, or club not mapped — caller falls back to the generic
 * shield). Subscribes to both the config store and the manifest store, so
 * flipping the remote switch re-renders live.
 */
export function useClubLogoUrl(teamName: string): string | null {
  const enabled = useRemoteConfigStore((s) =>
    Platform.OS === 'web' ? !!s.config.clubLogosWeb : !!s.config.clubLogosNative,
  );
  const manifest = useClubLogoStore((s) => s.manifest);

  if (!enabled) return null;
  if (!manifest) {
    void loadManifest();
    return null;
  }
  const file = manifest.clubs[teamName];
  return file ? `${LOGO_ORIGIN}${manifest.base}${file}` : null;
}

/** Test seam: inject a manifest and skip network. */
export function __setManifestForTests(manifest: LogoManifest | null): void {
  loadStarted = manifest !== null;
  useClubLogoStore.setState({ manifest });
}
