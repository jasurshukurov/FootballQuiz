import { RefObject } from 'react';
import { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';

// Re-export the pure Wordle-style share-text builder. It lives in a separate,
// React-Native-free module (lib/shareText.ts) so it stays unit-testable under
// the plain-node jest environment, but screens can import it from '@/lib/sharing'
// alongside captureAndShare.
export {
  buildShareText,
  buildDailyRecapText,
  whoAreYaStatusRows,
  type ShareResultInput,
  type DailyRecapInput,
} from '@/lib/shareText';

export async function captureAndShare(
  viewRef: RefObject<View | null>,
  text?: string,
): Promise<void> {
  if (!viewRef.current) return;

  const uri = await captureRef(viewRef, {
    format: 'png',
    quality: 1,
  });

  // iOS Sharing.shareAsync cannot combine text + image in a single share sheet,
  // so when we have a caption we copy it to the clipboard right before opening
  // the sheet — the user can paste it alongside the image. dialogTitle keeps the
  // prior behavior as a fallback where the platform surfaces it.
  if (text) {
    try {
      await Clipboard.setStringAsync(text);
    } catch {
      // Clipboard is best-effort; never block the image share on it.
    }
  }

  await Sharing.shareAsync(uri, {
    ...(text ? { dialogTitle: text } : {}),
  });
}
