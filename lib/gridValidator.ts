import { Player } from '@/types/player';
import { Grid, ValidationResult } from '@/types/grid';
import { findValidPlayers } from './gridGenerator';

const MIN_PLAYERS_PER_CELL = 5;

/**
 * Validate a grid, ensuring every cell has at least MIN_PLAYERS_PER_CELL valid players.
 */
export function validateGrid(grid: Grid, players: Player[]): ValidationResult {
  const cellResults: ValidationResult['cellResults'] = [];
  const invalidCells: ValidationResult['invalidCells'] = [];

  for (let row = 0; row < 3; row++) {
    const rowResults: ValidationResult['cellResults'][number] = [];
    for (let col = 0; col < 3; col++) {
      const cell = grid.cells[row][col];
      const validPlayers = findValidPlayers(players, cell.criteriaX, cell.criteriaY);
      const playerCount = validPlayers.length;
      const isValid = playerCount >= MIN_PLAYERS_PER_CELL;

      rowResults.push({ row, col, playerCount, isValid });

      if (!isValid) {
        invalidCells.push({ row, col, playerCount });
      }
    }
    cellResults.push(rowResults);
  }

  return {
    isValid: invalidCells.length === 0,
    cellResults,
    invalidCells,
  };
}

/**
 * Check if two criteria would produce an impossible combination
 * (e.g., same type with different values means no player can match both).
 */
export function isImpossibleCombination(
  criteriaX: { type: string; value: string },
  criteriaY: { type: string; value: string },
): boolean {
  if (criteriaX.type === criteriaY.type && criteriaX.value !== criteriaY.value) {
    return true;
  }
  return false;
}
