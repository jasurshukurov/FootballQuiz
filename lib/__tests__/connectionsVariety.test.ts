/**
 * Variety + correctness invariants for the expanded Connections archetype
 * engine, swept across 60 consecutive daily puzzles:
 *   - always 4 solvable categories of 4 with 16 unique names
 *   - unique partition (exact check against the generator's own criteria)
 *   - 6-day hard no-repeat window on category identities
 *   - kind mixing: never 3+ categories of one kind, club-flavored groups <= 2
 *   - deterministic per (seed, date, skill tier)
 *   - every archetype kind appears somewhere in the sweep
 */

import {
  generateConnectionsPuzzle,
  specMatchersForIdentity,
  ConnectionsPuzzle,
  ConnectionsArchetypeKind,
} from '../connectionsGenerator';
import { getModeSeed } from '../dailySeed';
import { getAllPlayers } from '../playerData';
import { Player } from '../../types/player';

const SWEEP_DAYS = 60;
const START = new Date(2026, 6, 13); // Mon 2026-07-13, local

function dateStr(offset: number): string {
  const d = new Date(START);
  d.setDate(d.getDate() + offset);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Generate the whole sweep once — the suite's assertions all read from it.
const DATES = Array.from({ length: SWEEP_DAYS }, (_, i) => dateStr(i));
const PUZZLES: ConnectionsPuzzle[] = DATES.map((d) =>
  generateConnectionsPuzzle(getModeSeed('connections', d), d),
);

const ALL_KINDS: ConnectionsArchetypeKind[] = [
  'club',
  'nationality',
  'position',
  'league',
  'nat_pos',
  'league_pos',
  'value',
  'played_for',
  'first_letter',
];

describe('Connections 60-day sweep: board validity', () => {
  it('always yields 4 categories of 4 with 16 unique names', () => {
    PUZZLES.forEach((p) => {
      expect(p.categories).toHaveLength(4);
      p.categories.forEach((c) => {
        expect(c.playerNames).toHaveLength(4);
        expect(c.kind).toBeDefined();
        expect(c.identity).toBeDefined();
        expect(c.playerIds).toHaveLength(4);
      });
      const names = p.categories.flatMap((c) => c.playerNames);
      expect(new Set(names).size).toBe(16);
      expect(new Set(p.shuffledNames).size).toBe(16);
      expect([...p.shuffledNames].sort()).toEqual([...names].sort());
    });
  });

  it('admits exactly one valid partition (unique-partition invariant)', () => {
    const byId = new Map<number, Player>(getAllPlayers().map((pl) => [pl.id, pl]));
    PUZZLES.forEach((p) => {
      const matchers = p.categories.map((c) => specMatchersForIdentity(c.identity!));
      p.categories.forEach((cat, ci) => {
        expect(matchers[ci]).toBeDefined();
        for (const id of cat.playerIds!) {
          const player = byId.get(id)!;
          expect(player).toBeDefined();
          // Every member satisfies its own category...
          expect(matchers[ci]!.matches(player)).toBe(true);
          // ...and could never be argued into any other category on the board.
          matchers.forEach((m, cj) => {
            if (cj !== ci) expect(m!.conflicts(player)).toBe(false);
          });
        }
      });
    });
  });

  it('assigns difficulty 0..3 in order', () => {
    PUZZLES.forEach((p) => p.categories.forEach((c, i) => expect(c.difficulty).toBe(i)));
  });
});

describe('Connections 60-day sweep: variety window', () => {
  it('never repeats a category identity within 6 days', () => {
    for (let i = 0; i < PUZZLES.length; i++) {
      const ids = new Set(PUZZLES[i].categories.map((c) => c.identity!));
      for (let back = 1; back <= 6 && i - back >= 0; back++) {
        for (const prev of PUZZLES[i - back].categories) {
          expect(ids.has(prev.identity!)).toBe(false);
        }
      }
    }
  });

  it('never uses 3+ categories of the same kind in one puzzle', () => {
    PUZZLES.forEach((p) => {
      const counts = new Map<string, number>();
      p.categories.forEach((c) => counts.set(c.kind!, (counts.get(c.kind!) ?? 0) + 1));
      for (const n of counts.values()) expect(n).toBeLessThanOrEqual(2);
    });
  });

  it('caps club-flavored groups (club + played_for) at 2 per puzzle', () => {
    PUZZLES.forEach((p) => {
      const clubbish = p.categories.filter(
        (c) => c.kind === 'club' || c.kind === 'played_for',
      ).length;
      expect(clubbish).toBeLessThanOrEqual(2);
    });
  });

  it('uses every archetype kind at least once across the sweep', () => {
    const seen = new Set(PUZZLES.flatMap((p) => p.categories.map((c) => c.kind!)));
    for (const kind of ALL_KINDS) expect(seen).toContain(kind);
  });

  it('never shares a category value across one board (no dupe-reading groups)', () => {
    // e.g. "Brazil players" + "Brazilian defenders" must not co-exist.
    PUZZLES.forEach((p) => {
      const natVals = p.categories
        .map((c) => c.identity!)
        .filter((id) => id.startsWith('nationality:') || id.startsWith('nat_pos:'))
        .map((id) => id.split(':')[1].split('|')[0]);
      expect(new Set(natVals).size).toBe(natVals.length);
    });
  });
});

describe('Connections determinism + skill tiers', () => {
  it('same (seed, date) => identical puzzle', () => {
    for (const d of DATES.slice(0, 7)) {
      const seed = getModeSeed('connections', d);
      const a = generateConnectionsPuzzle(seed, d);
      const b = generateConnectionsPuzzle(seed, d);
      expect(a.categories.map((c) => c.identity)).toEqual(b.categories.map((c) => c.identity));
      expect(a.categories.map((c) => c.playerNames)).toEqual(
        b.categories.map((c) => c.playerNames),
      );
      expect(a.shuffledNames).toEqual(b.shuffledNames);
    }
  });

  it('every skill tier yields a valid deterministic puzzle', () => {
    for (const tier of [-1, 0, 1] as const) {
      for (const d of DATES.slice(0, 7)) {
        const seed = getModeSeed('connections', d);
        const a = generateConnectionsPuzzle(seed, d, tier);
        const b = generateConnectionsPuzzle(seed, d, tier);
        expect(a.categories).toHaveLength(4);
        a.categories.forEach((c) => expect(c.playerNames).toHaveLength(4));
        expect(new Set(a.categories.flatMap((c) => c.playerNames)).size).toBe(16);
        expect(a.categories.map((c) => c.identity)).toEqual(b.categories.map((c) => c.identity));
      }
    }
  });

  it('neutral tier (empty skill store) matches the default daily puzzle', () => {
    const d = DATES[0];
    const seed = getModeSeed('connections', d);
    const dflt = generateConnectionsPuzzle(seed, d);
    const neutral = generateConnectionsPuzzle(seed, d, 0);
    expect(dflt.categories.map((c) => c.identity)).toEqual(
      neutral.categories.map((c) => c.identity),
    );
  });
});
