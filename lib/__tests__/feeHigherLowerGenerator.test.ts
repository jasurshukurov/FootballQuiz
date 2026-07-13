import {
  generateFeeQueue,
  getAllFeeMoves,
  feesAreDecisive,
  MIN_FEE_GAP,
} from '@/lib/feeHigherLowerGenerator';

describe('feeHigherLowerGenerator', () => {
  it('parses a healthy pool of numeric-fee moves', () => {
    const moves = getAllFeeMoves();
    expect(moves.length).toBeGreaterThan(300);
    for (const m of moves.slice(0, 50)) {
      expect(m.fee).toBeGreaterThan(0);
      expect(m.fromClub).not.toBe(m.toClub);
      expect(Number.isInteger(m.year)).toBe(true);
    }
  });

  it('is deterministic for a given seed', () => {
    const a = generateFeeQueue(12345, 60);
    const b = generateFeeQueue(12345, 60);
    expect(a).toEqual(b);
  });

  it('produces different queues for different seeds', () => {
    const a = generateFeeQueue(1, 60).map((m) => m.playerName + m.year);
    const b = generateFeeQueue(2, 60).map((m) => m.playerName + m.year);
    expect(a).not.toEqual(b);
  });

  it('keeps every consecutive fee gap >= 10% (decisive)', () => {
    const queue = generateFeeQueue(777, 100);
    expect(queue.length).toBeGreaterThan(40);
    for (let i = 1; i < queue.length; i++) {
      expect(feesAreDecisive(queue[i - 1].fee, queue[i].fee)).toBe(true);
      const hi = Math.max(queue[i - 1].fee, queue[i].fee);
      const lo = Math.min(queue[i - 1].fee, queue[i].fee);
      expect((hi - lo) / lo).toBeGreaterThanOrEqual(MIN_FEE_GAP);
    }
  });

  it('never repeats a player within the first 20 rounds', () => {
    const queue = generateFeeQueue(42, 100).slice(0, 20);
    const names = queue.map((m) => m.playerName);
    expect(new Set(names).size).toBe(names.length);
  });
});
