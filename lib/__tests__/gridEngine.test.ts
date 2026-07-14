import {
  generateDailyGrid,
  generateGridFromSeed,
  getGridCategoryLibrary,
  hintForCell,
  scoreCorrectPick,
  GRID_BASE_POINTS,
  GRID_MIN_ELIGIBLE,
  GRID_MIN_FAMOUS,
  GRID_FAMOUS_FAME,
  DailyGrid,
} from '@/lib/gridEngine';
import { SkillTier } from '@/lib/difficultyCurve';
import { getAllPlayers, getFameForPlayer, isActivePlayer } from '@/lib/playerData';
import { Player } from '@/types/player';

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d + days);
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${dt.getFullYear()}-${mm}-${dd}`;
}

const headerKeys = (g: DailyGrid) => [...g.rows, ...g.cols].map((h) => h.key);

function fakePlayer(overrides: Partial<Player>): Player {
  return {
    id: 999_999,
    name: 'Test Player',
    normalized_name: 'test player',
    nationality: 'Testland',
    current_team: 'Test FC',
    league: '',
    position: 'Defender',
    market_value: 0,
    image_url: '',
    ...overrides,
  };
}

describe('gridEngine — 30-day validity sweep', () => {
  const EPOCH = '2026-07-01';
  const tiers: SkillTier[] = [-1, 0, 1];

  it('every cell clears the floors, headers mix and never repeat, all tiers', () => {
    for (let i = 0; i < 30; i++) {
      const date = addDays(EPOCH, i);
      for (const tier of tiers) {
        const grid = generateDailyGrid(date, tier);

        // 3x3 shape
        expect(grid.rows).toHaveLength(3);
        expect(grid.cols).toHaveLength(3);
        expect(grid.cells).toHaveLength(3);

        // Every intersection is answerable and guessable.
        for (const row of grid.cells) {
          expect(row).toHaveLength(3);
          for (const cell of row) {
            expect(cell.eligiblePlayers.length).toBeGreaterThanOrEqual(GRID_MIN_ELIGIBLE);
            expect(cell.famousCount).toBeGreaterThanOrEqual(GRID_MIN_FAMOUS);
            // eligiblePlayers really do satisfy both headers
            for (const p of cell.eligiblePlayers.slice(0, 3)) {
              expect(cell.matches(p)).toBe(true);
            }
          }
        }

        // No duplicate headers.
        const keys = headerKeys(grid);
        expect(new Set(keys).size).toBe(6);

        // Mixing rule: >= 3 distinct kinds, <= 4 club headers, <= 1 value bar.
        const kinds = [...grid.rows, ...grid.cols].map((h) => h.kind);
        expect(new Set(kinds).size).toBeGreaterThanOrEqual(3);
        expect(kinds.filter((k) => k === 'club').length).toBeLessThanOrEqual(4);
        expect(kinds.filter((k) => k === 'value').length).toBeLessThanOrEqual(1);

        // Single-value-field kinds never sit on both axes (they'd cross to an
        // empty cell against themselves).
        for (const kind of ['nationality', 'league', 'position', 'value'] as const) {
          const onRows = grid.rows.some((h) => h.kind === kind);
          const onCols = grid.cols.some((h) => h.kind === kind);
          expect(onRows && onCols).toBe(false);
        }
      }
    }
  });

  it('is deterministic per (date, tier) and varies across days', () => {
    const a = generateDailyGrid('2026-07-15', 0);
    const b = generateDailyGrid('2026-07-15', 0);
    expect(a.id).toBe(b.id);
    expect(headerKeys(a)).toEqual(headerKeys(b));
    expect(a.cells[1][2].eligiblePlayers.map((p) => p.id)).toEqual(
      b.cells[1][2].eligiblePlayers.map((p) => p.id),
    );

    const ids = new Set<string>();
    for (let i = 0; i < 10; i++) ids.add(generateDailyGrid(addDays('2026-07-01', i), 0).id);
    expect(ids.size).toBeGreaterThanOrEqual(8);
  });

  it('skill tiers produce (usually) different but always valid grids', () => {
    const neutral = generateDailyGrid('2026-07-18', 0);
    const harder = generateDailyGrid('2026-07-18', 1);
    // Both valid regardless of whether the header draw shifted.
    for (const g of [neutral, harder]) {
      for (const row of g.cells) {
        for (const cell of row) {
          expect(cell.eligiblePlayers.length).toBeGreaterThanOrEqual(GRID_MIN_ELIGIBLE);
        }
      }
    }
  });

  it('never returns null / malformed grids for arbitrary seeds', () => {
    for (const seed of [0, 1, 42, 2 ** 31 - 1, -12345, 987654321]) {
      const g = generateGridFromSeed(seed, '2026-07-19', 0);
      expect(g.cells.flat()).toHaveLength(9);
      expect(new Set(headerKeys(g)).size).toBe(6);
    }
  });
});

describe('gridEngine — eligibility predicates', () => {
  const library = getGridCategoryLibrary();
  const byKey = (key: string) => {
    const cat = library.find((c) => c.key === key);
    if (!cat) throw new Error(`category ${key} missing from library`);
    return cat;
  };

  it('club membership is career-based: current squad AND recorded ex-players', () => {
    const arsenal = byKey('club:arsenal');
    const players = getAllPlayers();

    // Every current Arsenal player matches.
    const squad = players.filter((p) => p.current_team === 'Arsenal Football Club');
    expect(squad.length).toBeGreaterThan(10);
    for (const p of squad) expect(arsenal.matches(p)).toBe(true);

    // At least one ACTIVE player matches via recorded history despite playing
    // elsewhere now (the career-based half of the predicate).
    const exPlayers = players.filter(
      (p) => isActivePlayer(p) && p.current_team !== 'Arsenal Football Club' && arsenal.matches(p),
    );
    expect(exPlayers.length).toBeGreaterThan(0);

    // An unrecorded player never matches.
    expect(arsenal.matches(fakePlayer({ name: 'Nobody', normalized_name: 'nobody' }))).toBe(false);
  });

  it('league membership ignores stale individual league strings (honesty guard)', () => {
    const pl = byKey('league:Premier League');

    // A player at an unmapped club keeps a stale "Premier League" string —
    // must NOT count as Premier League.
    const stale = fakePlayer({ current_team: 'Al-Nowhere FC', league: 'Premier League' });
    expect(pl.matches(stale)).toBe(false);

    // A player at a real Premier League club matches (even with a blank string).
    const real = fakePlayer({ current_team: 'Arsenal Football Club', league: '' });
    expect(pl.matches(real)).toBe(true);
  });

  it('value bars use the exact market_value field', () => {
    const v40 = byKey('value:40');
    expect(v40.matches(fakePlayer({ market_value: 40_000_000 }))).toBe(true);
    expect(v40.matches(fakePlayer({ market_value: 39_999_999 }))).toBe(false);
  });

  it('position families map the DB position values', () => {
    const fw = byKey('pos:Attack');
    expect(fw.label).toBe('Forward');
    expect(fw.matches(fakePlayer({ position: 'Attack' }))).toBe(true);
    expect(fw.matches(fakePlayer({ position: 'Midfield' }))).toBe(false);
  });

  it('nationality categories carry flags and exact matching', () => {
    const brazil = byKey('nat:Brazil');
    expect(brazil.flag).toBeTruthy();
    expect(brazil.matches(fakePlayer({ nationality: 'Brazil' }))).toBe(true);
    expect(brazil.matches(fakePlayer({ nationality: 'Argentina' }))).toBe(false);
  });
});

describe('gridEngine — hints and rarity scoring', () => {
  it('hintForCell returns the most famous unused eligible player', () => {
    const grid = generateDailyGrid('2026-07-13', 0);
    const cell = grid.cells[0][0];
    const first = hintForCell(cell, new Set());
    expect(first).not.toBeNull();
    expect(first!.id).toBe(cell.eligiblePlayers[0].id);
    // Excluding the top pick yields the next one.
    const second = hintForCell(cell, new Set([first!.id]));
    expect(second).not.toBeNull();
    expect(second!.id).not.toBe(first!.id);
    // Hints are genuinely famous where the cell has famous depth.
    if (cell.famousCount > 0) {
      expect(getFameForPlayer(first!)?.fame_score ?? 0).toBeGreaterThanOrEqual(GRID_FAMOUS_FAME);
    }
  });

  it('scoreCorrectPick escalates rarity bonuses for obscure picks', () => {
    expect(scoreCorrectPick(90)).toEqual({
      base: GRID_BASE_POINTS,
      rarityBonus: 0,
      total: GRID_BASE_POINTS,
      deepCut: false,
    });
    expect(scoreCorrectPick(59).rarityBonus).toBe(10);
    expect(scoreCorrectPick(44).rarityBonus).toBe(20);
    expect(scoreCorrectPick(29).rarityBonus).toBe(30);
    expect(scoreCorrectPick(undefined).deepCut).toBe(true);
    expect(scoreCorrectPick(59).deepCut).toBe(true);
    expect(scoreCorrectPick(60).deepCut).toBe(false);
  });
});
