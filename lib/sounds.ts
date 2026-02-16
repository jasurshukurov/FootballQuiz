import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SOUND_ENABLED_KEY = '@sound_enabled';

let soundEnabled = true;
let soundEnabledLoaded = false;

async function loadSoundPreference(): Promise<void> {
  if (soundEnabledLoaded) return;
  try {
    const val = await AsyncStorage.getItem(SOUND_ENABLED_KEY);
    if (val !== null) {
      soundEnabled = val === 'true';
    }
    soundEnabledLoaded = true;
  } catch {
    // default to enabled
  }
}

// Load preference on import
loadSoundPreference();

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

export async function setSoundEnabled(enabled: boolean): Promise<void> {
  soundEnabled = enabled;
  soundEnabledLoaded = true;
  try {
    await AsyncStorage.setItem(SOUND_ENABLED_KEY, String(enabled));
  } catch {
    // ignore storage errors
  }
}

const soundCache: Record<string, Audio.Sound | null> = {};

// eslint-disable-next-line @typescript-eslint/no-var-requires
const SOUND_FILES: Record<string, number> = {
  click: require('@/assets/sounds/click.mp3'),
  whistle: require('@/assets/sounds/whistle.mp3'),
  cheer: require('@/assets/sounds/cheer.mp3'),
  crossbar: require('@/assets/sounds/crossbar.mp3'),
};

async function playSound(name: string): Promise<void> {
  await loadSoundPreference();
  if (!soundEnabled) return;

  try {
    // If cached sound exists, try to replay it
    if (soundCache[name]) {
      try {
        await soundCache[name]!.setPositionAsync(0);
        await soundCache[name]!.playAsync();
        return;
      } catch {
        // Sound object may be unloaded, recreate it
        soundCache[name] = null;
      }
    }

    const { sound } = await Audio.Sound.createAsync(SOUND_FILES[name], {
      shouldPlay: true,
    });
    soundCache[name] = sound;
  } catch {
    // Gracefully handle missing or corrupt sound files
    if (__DEV__) {
      console.warn(`[sounds] Could not play "${name}" — file may be missing`);
    }
  }
}

export function playClick(): void {
  playSound('click');
}

export function playWhistle(): void {
  playSound('whistle');
}

export function playCheer(): void {
  playSound('cheer');
}

export function playCrossbar(): void {
  playSound('crossbar');
}
