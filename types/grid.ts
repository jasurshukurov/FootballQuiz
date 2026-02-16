import { Player } from './player';

export type CriteriaType = 'current_team' | 'league' | 'nationality' | 'position';

export interface GridCriteria {
  type: CriteriaType;
  value: string;
  label: string;
}

export interface GridCell {
  row: number;
  col: number;
  criteriaX: GridCriteria;
  criteriaY: GridCriteria;
  validPlayers: Player[];
  guessedPlayer?: Player;
  isCorrect?: boolean;
}

export interface Grid {
  id: string;
  date: string;
  xCriteria: [GridCriteria, GridCriteria, GridCriteria];
  yCriteria: [GridCriteria, GridCriteria, GridCriteria];
  cells: GridCell[][];
}

export interface ValidationResult {
  isValid: boolean;
  cellResults: {
    row: number;
    col: number;
    playerCount: number;
    isValid: boolean;
  }[][];
  invalidCells: { row: number; col: number; playerCount: number }[];
}
