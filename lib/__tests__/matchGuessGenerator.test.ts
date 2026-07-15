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

  it('every option features the given team (banner never leaks the answer)', () => {
    for (const seed of [3, 18, 99, 512, 8080, 1, 42, 777]) {
      const puzzle = generateMatchGuessPuzzle(seed, '2026-07-13');
      for (const option of puzzle.options) {
        expect(option).toContain(puzzle.teamName);
      }
    }
  });

  it('distractors never reproduce the answer fixture and stay non-future', () => {
    for (const seed of [3, 18, 99, 512, 8080, 1, 42, 777]) {
      const puzzle = generateMatchGuessPuzzle(seed, '2026-07-13');
      const distractors = puzzle.options.filter((o) => o !== puzzle.answer);
      expect(distractors).toHaveLength(3);
      for (const d of distractors) {
        expect(d).not.toBe(puzzle.answer);
        const year = parseInt(d.slice(0, 4), 10);
        expect(year).toBeLessThanOrEqual(2026);
      }
    }
  });

  it('formats the answer label as "YYYY Competition · A vs B"', () => {
    const puzzle = generateMatchGuessPuzzle(1);
    expect(puzzle.answer).toMatch(/^\d{4} .+ · .+ vs .+$/);
  });

  it('is deterministic for a fixed seed + date (notability weighting)', () => {
    for (const seed of [1, 42, 777]) {
      const a = generateMatchGuessPuzzle(seed, '2026-07-13');
      const b = generateMatchGuessPuzzle(seed, '2026-07-13');
      expect(a).toEqual(b);
    }
  });

  it('reveals obscure (unknown/low-fame) names before the stars', () => {
    for (const seed of [2, 88, 314, 9000]) {
      const puzzle = generateMatchGuessPuzzle(seed, '2026-07-18');
      const fames = puzzle.revealOrder.map(fameOf);
      // ascending fame => the first revealed is the least famous of the XI.
      expect(fames[0]).toBe(Math.min(...fames));
      expect(fames[fames.length - 1]).toBe(Math.max(...fames));
    }
  });

  it('the band shifts which matches surface (iconic early week vs deep cuts)', () => {
    // Same seeds, different bands: the two date-driven selections should not be
    // identical across a spread of seeds (the weighting actually depends on the
    // date). Determinism per (seed,date) is covered above.
    const seeds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const monday = seeds.map((s) => generateMatchGuessPuzzle(s, '2026-07-13').matchId);
    const saturday = seeds.map((s) => generateMatchGuessPuzzle(s, '2026-07-18').matchId);
    expect(monday).not.toEqual(saturday);
  });
});
