import { RefObject } from 'react';
import { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

export async function captureAndShare(viewRef: RefObject<View | null>): Promise<void> {
  if (!viewRef.current) return;

  const uri = await captureRef(viewRef, {
    format: 'png',
    quality: 1,
  });

  await Sharing.shareAsync(uri);
}
