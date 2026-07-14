import { RefObject } from 'react';
import { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';

import { buildShareText as buildShareTextBase, type ShareResultInput } from '@/lib/shareText';
import { buildShareTimeSuffix } from '@/lib/solveTime';

// Re-export the pure Wordle-style share-text builder. It lives in a separate,
// React-Native-free module (lib/shareText.ts) so it stays unit-testable under
// the plain-node jest environment, but screens can import it from '@/lib/sharing'
// alongside captureAndShare.
export {
  buildDailyRecapText,
  whoAreYaStatusRows,
  type ShareResultInput,
  type DailyRecapInput,
} from '@/lib/shareText';

/**
 * buildShareText with optional solve-time support: when `solveTimeMs` is a
 * recorded daily time, a "⏱ M:SS" line is inserted just above the share URL.
 * Omitted / null (practice runs, no time recorded) leaves the text identical
 * to the base builder, so modes without solve-time wiring are unaffected.
 */
export function buildShareText(input: ShareResultInput & { solveTimeMs?: number | null }): string {
  const { solveTimeMs, ...rest } = input;
  const text = buildShareTextBase(rest as ShareResultInput);
  const suffix = buildShareTimeSuffix(solveTimeMs);
  if (!suffix) return text;
  // The share URL is always the last line — keep it last.
  const lines = text.split('\n');
  lines.splice(lines.length - 1, 0, suffix);
  return lines.join('\n');
}

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
