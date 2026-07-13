import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HAPTICS_ENABLED_KEY = '@haptics_enabled';

let hapticsEnabled = true;
let hapticsEnabledLoaded = false;

async function loadHapticsPreference(): Promise<void> {
  if (hapticsEnabledLoaded) return;
  try {
    const val = await AsyncStorage.getItem(HAPTICS_ENABLED_KEY);
    if (val !== null) {
      hapticsEnabled = val === 'true';
    }
    hapticsEnabledLoaded = true;
  } catch {
    // default to enabled
  }
}

// Load preference on import
loadHapticsPreference();

export function isHapticsEnabled(): boolean {
  return hapticsEnabled;
}

export async function setHapticsEnabled(enabled: boolean): Promise<void> {
  hapticsEnabled = enabled;
  hapticsEnabledLoaded = true;
  try {
    await AsyncStorage.setItem(HAPTICS_ENABLED_KEY, String(enabled));
  } catch {
    // ignore storage errors
  }
}

export async function triggerImpact(
  style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light,
): Promise<void> {
  await loadHapticsPreference();
  if (!hapticsEnabled) return;
  try {
    await Haptics.impactAsync(style);
  } catch {
    // gracefully handle unsupported devices
  }
}

export async function triggerNotification(type: Haptics.NotificationFeedbackType): Promise<void> {
  await loadHapticsPreference();
  if (!hapticsEnabled) return;
  try {
    await Haptics.notificationAsync(type);
  } catch {
    // gracefully handle unsupported devices
  }
}
