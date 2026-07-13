import { Player } from '@/types/player';
import { ComparisonResult, GuessResult } from '@/types/game';
import { getPlayerAge } from '@/lib/dailyPuzzle';

function compareString(attribute: string, guessVal: string, targetVal: string): ComparisonResult {
  return {
    attribute,
    guessValue: guessVal,
    targetValue: targetVal,
    status: guessVal === targetVal ? 'CORRECT' : 'WRONG',
  };
}

function compareNumeric(
  attribute: string,
  guessVal: number,
  targetVal: number,
  format: (v: number) => string,
): ComparisonResult {
  let status: ComparisonResult['status'];
  if (guessVal === targetVal) {
    status = 'CORRECT';
  } else if (guessVal < targetVal) {
    status = 'HIGHER';
  } else {
    status = 'LOWER';
  }

  return {
    attribute,
    guessValue: format(guessVal),
    targetValue: format(targetVal),
    status,
  };
}

function compareAge(guessAge: number | null, targetAge: number | null): ComparisonResult {
  // Only ~1,419 players have a known DOB. When either age is missing we can't
  // give an honest HIGHER/LOWER arrow, so show '?' for the unknown side and
  // mark WRONG (the least-misleading legal status) rather than faking age 0.
  if (guessAge === null || targetAge === null) {
    return {
      attribute: 'age',
      guessValue: guessAge === null ? '?' : String(guessAge),
      targetValue: targetAge === null ? '?' : String(targetAge),
      status: 'WRONG',
    };
  }
  return compareNumeric('age', guessAge, targetAge, (v) => String(v));
}

export function comparePlayers(guess: Player, target: Player): GuessResult {
  const guessAge = getPlayerAge(guess.id);
  const targetAge = getPlayerAge(target.id);

  const comparisons = {
    team: compareString('team', guess.current_team, target.current_team),
    league: compareString('league', guess.league, target.league),
    nationality: compareString('nationality', guess.nationality, target.nationality),
    position: compareString('position', guess.position, target.position),
    age: compareAge(guessAge, targetAge),
  };

  const isCorrect = guess.id === target.id;

  return { player: guess, comparisons, isCorrect };
}
