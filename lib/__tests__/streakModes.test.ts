/**
 * Regression tests for the Higher/Lower + Market Movers retention/determinism
 * work:
 *   - Deterministic mid-run queue extension that CONTINUES the difficulty ramp
 *     (startRound) and gap-checks the seam pair against the previous tail.
 *   - Tie-safe guess correctness (equal values correct for both guesses).
 *   - Market Movers applies the weekly band fame offset like Higher/Lower.
 */

import { generatePlayerQueue, getFameScore, isHigherLowerCorrect } from '../higherLowerGenerator';
import { generateFeeQueue, feesAreDecisive, MIN_FEE_GAP } from '../feeHigherLowerGenerator';
import { progressionForRound } from '../difficultyCurve';
import { getFameByName } from '../playerData';

describe('isHigherLowerCorrect (tie handling)', () => {
  it('resolves clear higher/lower cases', () => {
    expect(isHigherLowerCorrect('higher', 100, 200)).toBe(true);
    expect(isHigherLowerCorrect('higher', 200, 100)).toBe(false);
    expect(isHigherLowerCorrect('lower', 200, 100)).toBe(true);
    expect(isHigherLowerCorrect('lower', 100, 200)).toBe(false);
  });

  it('treats a tie (equal values) as correct for BOTH guesses (never a coin-flip)', () => {
    expect(isHigherLowerCorrect('higher', 100, 100)).toBe(true);
    expect(isHigherLowerCorrect('lower', 100, 100)).toBe(true);
  });
});

describe('Higher/Lower deterministic extension', () => {
  const BASE_SEED = 555;
  const base = generatePlayerQueue(BASE_SEED, 100, 0);
  const tail = base[base.length - 1];
  const extSeed = 4321;

  it('is deterministic for the same extension seed + startRound + tail', () => {
    const a = generatePlayerQueue(extSeed, 50, 0, base.length, tail.market_value);
    const b = generatePlayerQueue(extSeed, 50, 0, base.length, tail.market_value);
    expect(a).toEqual(b);
  });

  it('gap-checks the seam pair (old tail vs new head) — never an equal join', () => {
    const ext = generatePlayerQueue(extSeed, 50, 0, base.length, tail.market_value);
    expect(ext[0].market_value).not.toBe(tail.market_value);
    const gapRatio = progressionForRound(base.length).gapRatio;
    const hi = Math.max(tail.market_value, ext[0].market_value);
    const lo = Math.min(tail.market_value, ext[0].market_value);
    expect((hi - lo) / lo).toBeGreaterThanOrEqual(gapRatio);
  });

  it('CONTINUES the ramp: an extension at round >= 20 stays under the fame cap', () => {
    const ext = generatePlayerQueue(extSeed, 50, 0, base.length, tail.market_value);
    // startRound = 100, so every extension round is a deep round (cap 68).
    ext.forEach((p) => expect(getFameScore(p) ?? 0).toBeLessThanOrEqual(68));
  });
});

describe('Market Movers deterministic extension', () => {
  const base = generateFeeQueue(88, 50, 0, 0);
  const tail = base[base.length - 1];
  const extSeed = 9090;

  it('is deterministic for the same extension seed + startRound + tail fee', () => {
    const a = generateFeeQueue(extSeed, 30, base.length, 0, tail.fee);
    const b = generateFeeQueue(extSeed, 30, base.length, 0, tail.fee);
    expect(a).toEqual(b);
  });

  it('gap-checks the seam pair against the threaded previous tail fee', () => {
    const ext = generateFeeQueue(extSeed, 30, base.length, 0, tail.fee);
    expect(ext[0].fee).not.toBe(tail.fee);
    expect(feesAreDecisive(tail.fee, ext[0].fee)).toBe(true);
  });

  it('CONTINUES the ramp: an extension at round >= 20 stays under the fame cap', () => {
    const ext = generateFeeQueue(extSeed, 30, base.length, 0, tail.fee);
    ext.forEach((m) => {
      expect(getFameByName(m.playerName)?.fame_score ?? 0).toBeLessThanOrEqual(68);
    });
  });
});

describe('Market Movers applies the weekly band fame offset', () => {
  const fameOf = (m: { playerName: string }) => getFameByName(m.playerName)?.fame_score ?? 0;
  const median = (a: number[]) => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];

  it('positive offset skews early rounds MORE famous than a negative offset', () => {
    const SEED = 314159;
    const famous = generateFeeQueue(SEED, 40, 0, 10).slice(0, 12).map(fameOf);
    const obscure = generateFeeQueue(SEED, 40, 0, -20).slice(0, 12).map(fameOf);
    expect(median(famous)).toBeGreaterThan(median(obscure));
  });

  it('still guarantees a >= 10% gap on every consecutive pair regardless of offset', () => {
    for (const offset of [10, 0, -10]) {
      const queue = generateFeeQueue(777, 80, 0, offset);
      for (let i = 1; i < queue.length; i++) {
        const hi = Math.max(queue[i - 1].fee, queue[i].fee);
        const lo = Math.min(queue[i - 1].fee, queue[i].fee);
        expect((hi - lo) / lo).toBeGreaterThanOrEqual(MIN_FEE_GAP);
      }
    }
  });
});
