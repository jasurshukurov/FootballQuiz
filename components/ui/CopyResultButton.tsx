import React, { useCallback, useRef, useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import { NotificationFeedbackType } from 'expo-haptics';

import RetroButton from '@/components/ui/RetroButton';
import { triggerNotification } from '@/lib/haptics';

interface CopyResultButtonProps {
  /** The Wordle-style block from buildShareText. */
  text: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
}

/** Copies the share text to the clipboard with a success haptic and a brief
 *  "Copied!" confirmation on the button label. */
export default function CopyResultButton({ text, variant = 'secondary' }: CopyResultButtonProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = useCallback(async () => {
    await Clipboard.setStringAsync(text);
    triggerNotification(NotificationFeedbackType.Success);
    setCopied(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopied(false), 1500);
  }, [text]);

  return (
    <RetroButton
      title={copied ? 'Copied!' : 'Copy Result'}
      onPress={handleCopy}
      variant={variant}
      haptic="none"
    />
  );
}
