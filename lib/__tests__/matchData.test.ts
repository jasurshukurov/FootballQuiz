import { Match } from '../../types/match';
import {
  foldName,
  buildGuessPool,
  buildSlotIndex,
  resolveGuess,
  matchNotability,
  getMatchTier,
  getMatchCategory,
  getDailyMatch,
  getMatchById,
  getPlayableMatches,
} from '../matchData';
import { getDailyNumber } from '../dailyPuzzle';

const LINEUP = [
  'Gianluigi Buffon',
  'Diego Maradona',
  'Zinedine Zidane',
  'Ronaldinho',
  'Thierry Henry',
  'Paolo Maldini',
  'Xavi Hernandez',
  'Andrea Pirlo',
  'Kaka',
  'Samuel Etoo',
  'Wesley Sneijder',
];

describe('foldName', () => {
  it('folds diacritics and lowercases', () => {
    expect(foldName('Mesut Özil')).toBe('mesut ozil');
    expect(foldName('  KAKÁ ')).toBe('kaka');
  });
});

describe('buildGuessPool (full-DB autocomplete)', () => {
  const pool = buildGuessPool(LINEUP);

  it('feeds the full player universe, not just the 11 answers', () => {
    // The anti-spoiler guarantee: the pool must be far larger than the lineup.
    expect(pool.length).toBeGreaterThan(1000);
  });

  it('makes every lineup name typeable (real or synthetic)', () => {
    const folded = new Set(pool.map((p) => foldName(p.name)));
    LINEUP.forEach((name) => expect(folded.has(foldName(name))).toBe(true));
  });

  it('appends a synthetic entry for a name absent from the DB', () => {
    const invented = 'Zzqwx Nonexistent Legend';
    const withInvented = buildGuessPool([invented]);
    const match = withInvented.find((p) => foldName(p.name) === foldName(invented));
    expect(match).toBeDefined();
    expect(withInvented.length).toBe(buildGuessPool([]).length + 1);
  });
});

describe('buildSlotIndex + resolveGuess (auto-placement)', () => {
  const slotIndex = buildSlotIndex(LINEUP);

  it('maps each folded name to its slot', () => {
    expect(slotIndex.byName.get(foldName('Diego Maradona'))).toBe(1);
    expect(slotIndex.byName.get(foldName('Wesley Sneijder'))).toBe(10);
  });

  it('auto-places a correct guess into its own slot regardless of typed accents', () => {
    const out = resolveGuess('samuel etoo', slotIndex, new Set());
    expect(out).toEqual({ kind: 'correct', slot: 9 });
  });

  it('costs a life for a player not in the XI', () => {
    expect(resolveGuess('Lionel Messi', slotIndex, new Set())).toEqual({ kind: 'wrong' });
  });

  it('is a no-op for an already-revealed player', () => {
    const revealed = new Set([1]);
    expect(resolveGuess('Diego Maradona', slotIndex, revealed)).toEqual({
      kind: 'already',
      slot: 1,
    });
  });
});

describe('alias identity layer (same human, different spelling)', () => {
  it('accepts the DB row of a short team-sheet name ("Aguero" -> Sergio Agüero)', () => {
    // The 2012 title decider's team sheet says "Aguero"; the DB row is
    // "Sergio Agüero" (id 26399). Picking it from search must fill the slot.
    const m = getMatchById('epl-mancity-qpr-2012')!;
    expect(m).toBeDefined();
    const idx = buildSlotIndex(m.lineup_a_names, m.match_id);
    const slot = m.lineup_a_names.findIndex((n) => foldName(n) === 'aguero');
    expect(resolveGuess({ name: 'Sergio Agüero', id: 26399 }, idx, new Set())).toEqual({
      kind: 'correct',
      slot,
    });
    // ... and typing the team-sheet spelling (the synthetic entry) still works.
    expect(resolveGuess({ name: 'Aguero', id: 9_000_010 }, idx, new Set())).toEqual({
      kind: 'correct',
      slot,
    });
  });

  it('accepts an Emerson Palmieri-class pick (full name on sheet, mononym in DB)', () => {
    const m = getMatchById('europa-league-final-2019')!;
    const side = m.lineup_a_names.some((n) => foldName(n) === 'emerson palmieri')
      ? m.lineup_a_names
      : m.lineup_b_names;
    const idx = buildSlotIndex(side, m.match_id);
    const slot = side.findIndex((n) => foldName(n) === 'emerson palmieri');
    expect(slot).toBeGreaterThanOrEqual(0);
    // Both duplicate DB rows of the same human count.
    expect(resolveGuess({ name: 'Emerson', id: 181778 }, idx, new Set())).toEqual({
      kind: 'correct',
      slot,
    });
    expect(resolveGuess({ name: 'Émerson', id: 39073 }, idx, new Set())).toEqual({
      kind: 'correct',
      slot,
    });
  });

  it('keeps a good-faith namesake pick correct (name match stays sufficient)', () => {
    // A same-named DB player with a DIFFERENT id than the alias target still
    // scores: the id layer only ADDS acceptances, never removes name matches.
    const m = getMatchById('epl-mancity-qpr-2012')!;
    const idx = buildSlotIndex(m.lineup_a_names, m.match_id);
    const slot = m.lineup_a_names.findIndex((n) => foldName(n) === 'silva');
    expect(resolveGuess({ name: 'Silva', id: 123456789 }, idx, new Set())).toEqual({
      kind: 'correct',
      slot,
    });
  });

  it('leaves pure-synthetic legends on the name path (no alias, still typeable)', () => {
    // "Sergio Goycochea" (WC 1990 final) has no players_db row and no alias:
    // only the exact (folded) spelling scores; a random DB id does not.
    const m = getMatchById('wc-final-1990')!;
    const idx = buildSlotIndex(m.lineup_b_names, m.match_id);
    const slot = m.lineup_b_names.findIndex((n) => foldName(n) === 'sergio goycochea');
    expect(slot).toBeGreaterThanOrEqual(0);
    expect(resolveGuess({ name: 'Sergio Goycochea', id: 9_000_000 }, idx, new Set())).toEqual({
      kind: 'correct',
      slot,
    });
    expect(resolveGuess({ name: 'Sergio Romero', id: 12345 }, idx, new Set())).toEqual({
      kind: 'wrong',
    });
  });

  it('never lets an alias id override a name mismatch into the wrong slot', () => {
    // Ids map ONLY to their own slot; an id for slot A can't fill slot B.
    const m = getMatchById('epl-mancity-qpr-2012')!;
    const idx = buildSlotIndex(m.lineup_a_names, m.match_id);
    const agueroSlot = m.lineup_a_names.findIndex((n) => foldName(n) === 'aguero');
    const out = resolveGuess({ name: 'Sergio Agüero', id: 26399 }, idx, new Set());
    expect(out).toEqual({ kind: 'correct', slot: agueroSlot });
  });
});

const makeMatch = (competition: string, names: string[] = [], date = '2000-01-01'): Match => ({
  match_id: 't',
  date,
  competition,
  season: date.slice(0, 4),
  opponent_a: 'A',
  opponent_b: 'B',
  score: '0-0',
  lineup_a_ids: [],
  lineup_b_ids: [],
  lineup_a_names: names,
  lineup_b_names: [],
});

describe('matchNotability', () => {
  it('rates an iconic final above a routine league game', () => {
    expect(matchNotability(makeMatch('FIFA World Cup Final'))).toBeGreaterThan(
      matchNotability(makeMatch('Bundesliga')),
    );
  });

  it('stays within 0-100', () => {
    const n = matchNotability(makeMatch('UEFA Champions League Final', LINEUP));
    expect(n).toBeGreaterThanOrEqual(0);
    expect(n).toBeLessThanOrEqual(100);
  });
});

describe('getMatchTier (difficulty badge)', () => {
  it('rates a star-studded World Cup final as legendary', () => {
    expect(getMatchTier(makeMatch('FIFA World Cup Final', LINEUP))).toBe('legendary');
  });

  it('rates an obscure fixture near the bottom of the ladder', () => {
    const tier = getMatchTier(makeMatch('Ligue 1'));
    expect(['beginner', 'amateur']).toContain(tier);
  });

  it('assigns a valid tier to every playable match', () => {
    const valid = new Set([
      'legendary',
      'world_class',
      'professional',
      'semi_pro',
      'amateur',
      'beginner',
    ]);
    for (const m of getPlayableMatches()) {
      expect(valid.has(getMatchTier(m))).toBe(true);
    }
  });
});

describe('getMatchCategory', () => {
  it('derives family + stage + era', () => {
    expect(
      getMatchCategory(makeMatch('UEFA Champions League Semi-Final', [], '2005-05-03')),
    ).toEqual({
      label: 'Champions League Semi-final',
      era: '2000s',
    });
    expect(getMatchCategory(makeMatch('FIFA World Cup Final', [], '1990-07-08'))).toEqual({
      label: 'World Cup Final',
      era: '1990s',
    });
  });

  it('keeps league fixtures stage-free', () => {
    expect(getMatchCategory(makeMatch('Premier League', [], '2012-05-13')).label).toBe(
      'League Classic',
    );
  });

  it('does not confuse the Club World Cup with the World Cup', () => {
    expect(getMatchCategory(makeMatch('FIFA Club World Cup Final')).label).toBe(
      'Club World Cup Final',
    );
  });

  it('categorizes every playable match (no fallback explosion)', () => {
    let fallback = 0;
    for (const m of getPlayableMatches()) {
      const { label, era } = getMatchCategory(m);
      expect(label.length).toBeGreaterThan(0);
      expect(era).toMatch(/^\d{4}s$/);
      if (label === 'Classic Match') fallback++;
    }
    // The taxonomy must cover the pool; the generic bucket stays tiny.
    expect(fallback).toBeLessThanOrEqual(getPlayableMatches().length * 0.02);
  });
});

describe('getDailyMatch', () => {
  it('is deterministic for the same day index', () => {
    expect(getDailyMatch(5).match_id).toBe(getDailyMatch(5).match_id);
  });

  it('always returns a fully playable match', () => {
    const playableIds = new Set(getPlayableMatches().map((m) => m.match_id));
    for (let day = 0; day < 60; day++) {
      expect(playableIds.has(getDailyMatch(day).match_id)).toBe(true);
    }
  });

  it('never repeats a match within a 60-day window (no-repeat backbone)', () => {
    // The QA sim treats any repeat across the window as a hard failure; the
    // schedule is a bijection over the full playable pool, so a cycle this short
    // must be collision-free.
    const seen = new Map<string, number>();
    for (let day = 0; day < 60; day++) {
      const m = getDailyMatch(day);
      expect(seen.has(m.match_id)).toBe(false);
      seen.set(m.match_id, day);
    }
    expect(seen.size).toBe(60);
  });

  it('never repeats across a 200-day window (well beyond any dedup window)', () => {
    // Per-weekday tiers rotate by weekday occurrence; the counter can't wrap
    // until ~7 x tierSize days, so a 200-day window is collision-free.
    const ids = new Set<string>();
    for (let day = 0; day < 200; day++) ids.add(getDailyMatch(day).match_id);
    expect(ids.size).toBe(200);
  });

  it('ramps smoothly through the calendar week (Mon easiest -> Sun hardest)', () => {
    // Replicate the scheduler's timezone-invariant weekday derivation so the
    // assertion tracks REAL calendar weekdays, not relative cycles.
    const offset = ((new Date().getDay() - getDailyNumber(new Date())) % 7) + 7;
    const byWeekday: Record<number, number[]> = {};
    for (let day = 0; day < 700; day++) {
      const wd = (day + offset) % 7;
      (byWeekday[wd] ??= []).push(matchNotability(getDailyMatch(day)));
    }
    const med = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
    // Mon -> Sun in calendar order; notability (ease) must never rise mid-week.
    const week = [1, 2, 3, 4, 5, 6, 0].map((wd) => med(byWeekday[wd]));
    for (let i = 1; i < week.length; i++) {
      expect(week[i]).toBeLessThanOrEqual(week[i - 1]);
    }
    // ... and the ramp must be a real ramp, not a flat line.
    expect(week[0]).toBeGreaterThan(week[6] + 15);
  });
});

describe('playable pool integrity (guards ETL expansions)', () => {
  it('every playable match has 11 distinct names per side and a unique identity', () => {
    const pool = getPlayableMatches();
    const ids = new Set<string>();
    const identities = new Set<string>();
    for (const m of pool) {
      expect(ids.has(m.match_id)).toBe(false);
      ids.add(m.match_id);
      const identity = `${m.date}|${[m.opponent_a, m.opponent_b].sort().join('|')}`;
      expect(identities.has(identity)).toBe(false);
      identities.add(identity);
      for (const names of [m.lineup_a_names, m.lineup_b_names]) {
        expect(names).toHaveLength(11);
        expect(new Set(names.map((n) => foldName(n))).size).toBe(11);
        names.forEach((n) => expect(n.trim().length).toBeGreaterThan(1));
      }
      expect(m.competition.length).toBeGreaterThan(0);
      expect(m.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
