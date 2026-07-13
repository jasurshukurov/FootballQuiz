import { comparePlayers } from '@/lib/comparePlayers';
import { Player } from '@/types/player';

function player(overrides: Partial<Player>): Player {
  return {
    id: 0,
    name: 'X',
    normalized_name: 'x',
    nationality: 'Germany',
    current_team: 'A',
    league: 'L',
    position: 'ST',
    market_value: 0,
    image_url: '',
    ...overrides,
  };
}

describe('comparePlayers age handling', () => {
  // id 10 (Miroslav Klose, b.1978) has a DOB entry; id 88888888 has none.
  const known = player({ id: 10 });
  const unknown = player({ id: 88888888 });

  it('shows a numeric age comparison when both players have a DOB', () => {
    const { comparisons } = comparePlayers(known, known);
    expect(comparisons.age.status).toBe('CORRECT');
    expect(comparisons.age.guessValue).not.toBe('?');
    expect(Number(comparisons.age.guessValue)).toBeGreaterThan(0);
  });

  it("uses '?' and WRONG (no directional arrow) when the guess has no DOB", () => {
    const { comparisons } = comparePlayers(unknown, known);
    expect(comparisons.age.guessValue).toBe('?');
    expect(comparisons.age.status).toBe('WRONG');
    // Never fabricate an age-0 arrow for players outside the DOB dataset.
    expect(comparisons.age.status).not.toBe('HIGHER');
    expect(comparisons.age.status).not.toBe('LOWER');
  });

  it("uses '?' for the target side when the target has no DOB", () => {
    const { comparisons } = comparePlayers(known, unknown);
    expect(comparisons.age.targetValue).toBe('?');
    expect(comparisons.age.status).toBe('WRONG');
  });
});
