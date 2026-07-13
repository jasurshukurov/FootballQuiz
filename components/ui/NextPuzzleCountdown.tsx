import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/constants/theme';

function msUntilLocalMidnight(): number {
  const now = new Date();
  const midnight = new Date(now);
  // Rolls forward to 00:00:00 of the next local day.
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime() - now.getTime();
}

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

interface NextPuzzleCountdownProps {
  label?: string;
}

/** Live "Next puzzle in HH:MM:SS" ticking to local midnight. */
export default function NextPuzzleCountdown({
  label = 'Next puzzle in',
}: NextPuzzleCountdownProps) {
  const [remaining, setRemaining] = useState(msUntilLocalMidnight);

  useEffect(() => {
    const id = setInterval(() => setRemaining(msUntilLocalMidnight()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.time}>{formatCountdown(remaining)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 2,
  },
  label: {
    fontSize: 11,
    fontFamily: fonts.subheading,
    color: colors.steelGray,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  time: {
    fontSize: 20,
    fontFamily: fonts.scoreboard,
    color: colors.pitchGreen,
    letterSpacing: 2,
  },
});
