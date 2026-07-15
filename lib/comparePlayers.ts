import { Player } from '@/types/player';
import { ComparisonResult, GuessResult } from '@/types/game';
import { getPlayerAge } from '@/lib/dailyPuzzle';
import { shortenClubName } from '@/lib/clubNames';

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

/**
 * True when the TARGET has a known DOB, so the age column carries a real signal.
 * When false, every guess's age cell is a dead '?' (compareAge can't produce an
 * honest HIGHER/LOWER without the target's age), so screens should grey or hide
 * the age column instead of presenting it as a live clue.
 */
export function targetHasAgeSignal(target: Player): boolean {
  return getPlayerAge(target.id) !== null;
}

export function comparePlayers(guess: Player, target: Player): GuessResult {
  const guessAge = getPlayerAge(guess.id);
  const targetAge = getPlayerAge(target.id);

  const comparisons = {
    // Match on the RAW names; shorten only what the cell displays ("Reial
    // Club Deportiu Espanyol de Barcelona" would overflow the team column).
    team: {
      ...compareString('team', guess.current_team, target.current_team),
      guessValue: shortenClubName(guess.current_team),
      targetValue: shortenClubName(target.current_team),
    },
    league: compareString('league', guess.league, target.league),
    nationality: compareString('nationality', guess.nationality, target.nationality),
    position: compareString('position', guess.position, target.position),
    age: compareAge(guessAge, targetAge),
  };

  const isCorrect = guess.id === target.id;

  return { player: guess, comparisons, isCorrect };
}
