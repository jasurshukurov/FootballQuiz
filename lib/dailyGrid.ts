import { Player } from '@/types/player';
import { Grid } from '@/types/grid';
import { generateValidGrid, hashDateSeed } from './gridGenerator';

/**
 * Generate a deterministic daily grid based on the date string.
 * Same date always produces the same grid.
 */
export function getDailyGrid(players: Player[], dateStr?: string): Grid | null {
  const date = dateStr ?? new Date().toISOString().split('T')[0];
  const seed = hashDateSeed(date);
  const grid = generateValidGrid(players, seed);

  if (grid) {
    return {
      ...grid,
      id: `daily-${date}`,
      date,
    };
  }

  return null;
}
