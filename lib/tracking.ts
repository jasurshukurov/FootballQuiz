import { Platform } from 'react-native';

/**
 * Request App Tracking Transparency permission on iOS.
 * Returns the tracking status string.
 *
 * Uses expo-tracking-transparency when available, otherwise returns 'granted'.
 */
export async function requestTrackingPermission(): Promise<string> {
  if (Platform.OS !== 'ios') {
    return 'granted';
  }

  try {
    const TrackingTransparency = await import('expo-tracking-transparency');
    const { status } = await TrackingTransparency.requestTrackingPermissionsAsync();
    return status;
  } catch {
    // expo-tracking-transparency not available; default to granted
    return 'granted';
  }
}
