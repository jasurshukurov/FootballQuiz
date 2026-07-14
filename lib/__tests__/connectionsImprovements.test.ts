import {
  generateConnectionsPuzzle,
  isOneAway,
  connectionsRank,
  ConnectionsCategory,
} from '../connectionsGenerator';
import { getModeSeed } from '../dailySeed';

const WEEK = [
  '2026-07-13', // Mon (easy)
  '2026-07-14', // Tue
  '2026-07-15', // Wed
  '2026-07-16', // Thu
  '2026-07-17', // Fri
  '2026-07-18', // Sat (expert)
  '2026-07-19', // Sun (wildcard)
];

describe('Connections 4-category guard', () => {
  it('always yields exactly 4 solvable categories of 4 across a full week', () => {
    for (const dateStr of WEEK) {
      const seed = getModeSeed('connections', dateStr);
      const p = generateConnectionsPuzzle(seed, dateStr);
      expect(p.categories).toHaveLength(4);
      p.categories.forEach((c) => expect(c.playerNames).toHaveLength(4));
      // 16 unique names => board is actually winnable.
      const names = p.categories.flatMap((c) => c.playerNames);
      expect(new Set(names).size).toBe(16);
      expect(new Set(p.shuffledNames).size).toBe(16);
    }
  });

  it('is deterministic per (seed, date)', () => {
    const seed = getModeSeed('connections', '2026-07-13');
    const a = generateConnectionsPuzzle(seed, '2026-07-13');
    const b = generateConnectionsPuzzle(seed, '2026-07-13');
    expect(a.categories.map((c) => c.name)).toEqual(b.categories.map((c) => c.name));
  });

  it('assigns difficulty 0..3 in easy -> hard order', () => {
    for (const dateStr of WEEK) {
      const p = generateConnectionsPuzzle(getModeSeed('connections', dateStr), dateStr);
      p.categories.forEach((c, i) => expect(c.difficulty).toBe(i));
    }
  });
});

describe('one-away detection', () => {
  const cats: ConnectionsCategory[] = [
    { name: 'A', difficulty: 0, playerNames: ['a1', 'a2', 'a3', 'a4'] },
    { name: 'B', difficulty: 1, playerNames: ['b1', 'b2', 'b3', 'b4'] },
  ];

  it('flags a selection with exactly 3 from one category', () => {
    expect(isOneAway(['a1', 'a2', 'a3', 'b1'], cats)).toBe(true);
  });

  it('does not flag a 2/2 split', () => {
    expect(isOneAway(['a1', 'a2', 'b1', 'b2'], cats)).toBe(false);
  });

  it('does not flag a complete (4/4) group', () => {
    expect(isOneAway(['a1', 'a2', 'a3', 'a4'], cats)).toBe(false);
  });

  it('ignores already-solved categories', () => {
    expect(isOneAway(['a1', 'a2', 'a3', 'b1'], cats, ['A'])).toBe(false);
  });

  it('requires a 4-tile selection', () => {
    expect(isOneAway(['a1', 'a2', 'a3'], cats)).toBe(false);
  });
});

describe('connections rank mapping', () => {
  it('a clean 4/4 sweep is the top tier; a 4-mistake win is not', () => {
    expect(connectionsRank(4, 0).nextLabel).toBeNull();
    expect(connectionsRank(4, 4).nextLabel).not.toBeNull();
  });

  it('is monotonic in groups found and in mistakes avoided', () => {
    // more groups found -> tier non-decreasing (mistakes fixed)
    for (let m = 0; m <= 4; m++) {
      let prev = connectionsRank(0, m).tier;
      for (let g = 1; g <= 4; g++) {
        const cur = connectionsRank(g, m).tier;
        expect(cur).toBeGreaterThanOrEqual(prev);
        prev = cur;
      }
    }
    // fewer mistakes -> tier non-decreasing (groups fixed)
    for (let g = 0; g <= 4; g++) {
      let prev = connectionsRank(g, 4).tier;
      for (let m = 3; m >= 0; m--) {
        const cur = connectionsRank(g, m).tier;
        expect(cur).toBeGreaterThanOrEqual(prev);
        prev = cur;
      }
    }
  });
});
