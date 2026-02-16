import { Player } from '@/types/player';
import { ComparisonResult, GuessResult } from '@/types/game';

function compareString(attribute: string, guessVal: string, targetVal: string): ComparisonResult {
  return {
    attribute,
    guessValue: guessVal,
    targetValue: targetVal,
    status: guessVal === targetVal ? 'CORRECT' : 'WRONG',
  };
}

function compareMarketValue(guessVal: number, targetVal: number): ComparisonResult {
  let status: ComparisonResult['status'];
  if (guessVal === targetVal) {
    status = 'CORRECT';
  } else if (guessVal < targetVal) {
    status = 'HIGHER';
  } else {
    status = 'LOWER';
  }

  const formatValue = (v: number) => `€${(v / 1_000_000).toFixed(1)}M`;

  return {
    attribute: 'marketValue',
    guessValue: formatValue(guessVal),
    targetValue: formatValue(targetVal),
    status,
  };
}

export function comparePlayers(guess: Player, target: Player): GuessResult {
  const comparisons = {
    team: compareString('team', guess.current_team, target.current_team),
    league: compareString('league', guess.league, target.league),
    nationality: compareString('nationality', guess.nationality, target.nationality),
    position: compareString('position', guess.position, target.position),
    marketValue: compareMarketValue(guess.market_value, target.market_value),
  };

  const isCorrect = guess.id === target.id;

  return { player: guess, comparisons, isCorrect };
}
