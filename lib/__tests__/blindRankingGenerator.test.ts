import {
  generateBlindRankingPuzzle,
  scoreRanking,
  rankingSlotStatuses,
  rawRankingValue,
  MAX_RANKING_POINTS,
} from '@/lib/blindRankingGenerator';

describe('generateBlindRankingPuzzle', () => {
  const seeds = [1, 2, 3, 50, 512, 9001];

  it('is deterministic for a fixed seed + date', () => {
    const a = generateBlindRankingPuzzle(4242, '2026-07-13');
    const b = generateBlindRankingPuzzle(4242, '2026-07-13');
    expect(a).toEqual(b);
  });

  it('picks 5 players with distinct, well-separated values (gap guard)', () => {
    for (const seed of seeds) {
      const puzzle = generateBlindRankingPuzzle(seed, '2026-07-13');
      expect(puzzle.players).toHaveLength(5);
      expect(puzzle.correctOrder).toHaveLength(5);

      // Values along the correct order must be strictly monotonic (distinct) and
      // separated by a meaningful relative gap so the ranking is knowledge, not
      // a coin flip.
      const byId = new Map(puzzle.players.map((p) => [p.id, p]));
      const orderedValues = puzzle.correctOrder.map((id) =>
        rawRankingValue(byId.get(id)!, puzzle.category),
      );
      for (let i = 1; i < orderedValues.length; i++) {
        const a = orderedValues[i - 1];
        const b = orderedValues[i];
        expect(a).not.toBe(b); // distinct-value rule
        const gap = Math.abs(a - b) / Math.max(a, b);
        // On a healthy pool the guard achieves at least a 1% separation between
        // neighbours (it prefers 5% and only relaxes toward distinct-only when a
        // pool truly can't fill 5 slots).
        expect(gap).toBeGreaterThanOrEqual(0.01);
      }
    }
  });
});

describe('scoreRanking (partial credit)', () => {
  const correct = [10, 20, 30, 40, 50];

  it('awards 2 per exact and 1 per adjacent, capped at 10', () => {
    // All exact.
    expect(scoreRanking([10, 20, 30, 40, 50], correct)).toEqual({
      points: 10,
      exact: 5,
      adjacent: 0,
    });
    // A single adjacent swap: positions 0 and 1 swapped -> both off-by-one.
    expect(scoreRanking([20, 10, 30, 40, 50], correct)).toEqual({
      points: 6 + 2, // 3 exact (30,40,50)=6 + 2 adjacent=2
      exact: 3,
      adjacent: 2,
    });
    // Fully reversed: ends are off-by-4/2, middle stays exact.
    const reversed = scoreRanking([50, 40, 30, 20, 10], correct);
    expect(reversed.exact).toBe(1); // only the centre (30) stays put
    expect(reversed.points).toBeLessThanOrEqual(MAX_RANKING_POINTS);
  });

  it('slot statuses agree with the score breakdown', () => {
    const user = [20, 10, 30, 50, 40];
    const statuses = rankingSlotStatuses(user, correct);
    const { exact, adjacent } = scoreRanking(user, correct);
    expect(statuses.filter((s) => s === 'exact')).toHaveLength(exact);
    expect(statuses.filter((s) => s === 'adjacent')).toHaveLength(adjacent);
  });
});
