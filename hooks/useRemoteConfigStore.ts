import { create } from 'zustand';

import { RemoteConfig, getDefaultConfig } from '@/lib/remoteConfig';

interface RemoteConfigState {
  config: RemoteConfig;
  setConfig: (config: RemoteConfig) => void;
}

/** Holds the remote config fetched at app start so any screen can read it
 *  (e.g. disabled_modes). Not persisted — it's refreshed on every launch. */
export const useRemoteConfigStore = create<RemoteConfigState>((set) => ({
  config: getDefaultConfig(),
  setConfig: (config) => set({ config }),
}));

/** Non-hook check usable outside React (e.g. from another store). */
export function isModeDisabled(mode: string): boolean {
  return useRemoteConfigStore.getState().config.disabled_modes.includes(mode);
}

/** Hook selector for the current disabled-modes list. */
export function useDisabledModes(): string[] {
  return useRemoteConfigStore((s) => s.config.disabled_modes);
}
