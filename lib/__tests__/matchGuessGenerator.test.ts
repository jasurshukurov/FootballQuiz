import { generateMatchGuessPuzzle, fameOf } from '@/lib/matchGuessGenerator';

describe('matchGuessGenerator', () => {
  it('is deterministic for a given seed', () => {
    const a = generateMatchGuessPuzzle(9999);
    const b = generateMatchGuessPuzzle(9999);
    expect(a).toEqual(b);
  });

  it('reveals an XI of 11 names ordered by ascending fame (famous last)', () => {
    for (const seed of [1, 7, 55, 200, 4242]) {
      const puzzle = generateMatchGuessPuzzle(seed);
      expect(puzzle.revealOrder).toHaveLength(11);
      const fames = puzzle.revealOrder.map(fameOf);
      for (let i = 1; i < fames.length; i++) {
        expect(fames[i]).toBeGreaterThanOrEqual(fames[i - 1]);
      }
    }
  });

  it('offers 4 distinct options containing the answer exactly once', () => {
    for (const seed of [3, 18, 99, 512, 8080]) {
      const puzzle = generateMatchGuessPuzzle(seed);
      expect(puzzle.options).toHaveLength(4);
      expect(new Set(puzzle.options).size).toBe(4);
      expect(puzzle.options.filter((o) => o === puzzle.answer)).toHaveLength(1);
      expect(puzzle.options[puzzle.answerIndex]).toBe(puzzle.answer);
    }
  });

  it('formats the answer label as "YYYY Competition — A vs B"', () => {
    const puzzle = generateMatchGuessPuzzle(1);
    expect(puzzle.answer).toMatch(/^\d{4} .+ — .+ vs .+$/);
  });
});
