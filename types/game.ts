import { Player } from './player';

export type AttributeStatus = 'CORRECT' | 'WRONG' | 'HIGHER' | 'LOWER';

export interface ComparisonResult {
  attribute: string;
  guessValue: string;
  targetValue: string;
  status: AttributeStatus;
}

export interface GuessResult {
  player: Player;
  comparisons: {
    team: ComparisonResult;
    league: ComparisonResult;
    nationality: ComparisonResult;
    position: ComparisonResult;
    marketValue: ComparisonResult;
  };
  isCorrect: boolean;
}

export type GameStatus = 'playing' | 'won' | 'lost';
