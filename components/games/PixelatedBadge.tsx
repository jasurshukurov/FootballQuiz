import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import TeamCrest from '@/components/ui/TeamCrest';
import { getTeamColors } from '@/data/teamColors';

interface PixelatedBadgeProps {
  teamName: string;
  pixelLevel: number;
  size?: number;
}

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { r: 128, g: 128, b: 128 };
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

function varyColor(hex: string, seed: number): string {
  const { r, g, b } = hexToRgb(hex);
  const vary = (v: number, s: number) => {
    const offset = ((s * 1664525 + 1013904223) & 0xff) - 128;
    return Math.max(0, Math.min(255, v + Math.floor(offset * 0.15)));
  };
  return `rgb(${vary(r, seed)},${vary(g, seed + 1)},${vary(b, seed + 2)})`;
}

export default function PixelatedBadge({ teamName, pixelLevel, size = 200 }: PixelatedBadgeProps) {
  const { primary, secondary } = getTeamColors(teamName);
  const crestHeight = size * 1.15;

  const blocks = useMemo(() => {
    if (pixelLevel >= 5) return null;

    const gridSizes: Record<number, number> = { 1: 8, 2: 6, 3: 4, 4: 2 };
    const transparencyRatios: Record<number, number> = {
      1: 0,
      2: 0.25,
      3: 0.5,
      4: 0.75,
    };

    const gridSize = gridSizes[pixelLevel] ?? 8;
    const transparencyRatio = transparencyRatios[pixelLevel] ?? 0;
    const blockW = size / gridSize;
    const blockH = crestHeight / gridSize;

    const result: React.ReactElement[] = [];

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const cellSeed = row * gridSize + col + pixelLevel * 100;
        const rand = ((cellSeed * 1664525 + 1013904223) & 0x7fffffff) / 0x7fffffff;

        if (rand < transparencyRatio) continue;

        const colorBase = rand > 0.5 ? primary : secondary;
        const color = varyColor(colorBase, cellSeed);

        result.push(
          <View
            key={`${row}-${col}`}
            style={{
              position: 'absolute',
              left: col * blockW,
              top: row * blockH,
              width: blockW + 0.5,
              height: blockH + 0.5,
              backgroundColor: color,
            }}
          />,
        );
      }
    }

    return result;
  }, [teamName, pixelLevel, size, primary, secondary, crestHeight]);

  return (
    <View
      style={[styles.container, { width: size, height: crestHeight, borderRadius: size * 0.15 }]}>
      <TeamCrest teamName={teamName} size={size} />
      {blocks && <View style={StyleSheet.absoluteFill}>{blocks}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
