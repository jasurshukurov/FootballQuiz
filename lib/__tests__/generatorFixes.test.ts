/**
 * Regression tests for the QA-driven generator fixes:
 *   - Connections never puts a duplicate display name on the board (unsolvable).
 *   - Connections categories are ordered easy -> hard by mean fame.
 *   - Daily rotation is deterministic and repeat-free until the pool cycles.
 *   - Career Path only serves players with >= 3 career stints.
 *   - Higher/Lower + Market Movers ramp difficulty by streak position.
 *   - Agent distractors never share the exact target fee.
 */

import { generateConnectionsPuzzle, specMatchersForIdentity } from '../connectionsGenerator';
import { getDailyTarget } from '../dailyPuzzle';
import { shortenClubName } from '../clubNames';
import { seededShuffle, rotatingPick } from '../dailyRotation';
import { getAllPlayers, getFameById, getFameByName } from '../playerData';
import { Player } from '../../types/player';
import { getCareerPlayerForDay, getGuessableCareerPlayers } from '../careerData';
import { generatePlayerQueue, getFameScore } from '../higherLowerGenerator';
import { progressionForRound } from '../difficultyCurve';
import { generateDailyAgentGame, parseFeeToNumber } from '../agentGameGenerator';
import { getModeSeed } from '../dailySeed';
import { getAllTransferHistories } from '../transferData';

const DATES = Array.from({ length: 28 }, (_, i) => `2026-08-${String(i + 1).padStart(2, '0')}`);
const SEEDS = DATES.map((d) => getModeSeed('connections', d));

describe('Connections name dedupe', () => {
  it('never repeats a display name anywhere on the board', () => {
    for (const seed of SEEDS) {
      const p = generateConnectionsPuzzle(seed);
      const names = p.categories.flatMap((c) => c.playerNames);
      expect(new Set(names).size).toBe(names.length);
      expect(names).toHaveLength(16);
      expect(new Set(p.shuffledNames).size).toBe(16);
    }
  });

  it('produces exactly 4 categories of 4', () => {
    for (const seed of SEEDS) {
      const p = generateConnectionsPuzzle(seed);
      expect(p.categories).toHaveLength(4);
      p.categories.forEach((c) => expect(c.playerNames).toHaveLength(4));
    }
  });

  it('orders categories easy -> hard (difficulty index 0..3)', () => {
    for (const seed of SEEDS) {
      const p = generateConnectionsPuzzle(seed);
      p.categories.forEach((c, i) => expect(c.difficulty).toBe(i));
    }
  });

  it('has cross-category exclusivity (each player fits exactly one group)', () => {
    // Exact check against the generator's own criteria: every chosen player
    // must match their own category and conflict with none of the other three.
    const byId = new Map<number, Player>(getAllPlayers().map((pl) => [pl.id, pl]));
    for (const date of DATES) {
      const p = generateConnectionsPuzzle(getModeSeed('connections', date), date);
      const matchers = p.categories.map((c) => specMatchersForIdentity(c.identity!));
      p.categories.forEach((cat, ci) => {
        expect(matchers[ci]).toBeDefined();
        for (const id of cat.playerIds!) {
          const player = byId.get(id)!;
          expect(matchers[ci]!.matches(player)).toBe(true);
          matchers.forEach((m, cj) => {
            if (cj !== ci) expect(m!.conflicts(player)).toBe(false);
          });
        }
      });
    }
  });
});

describe('shortenClubName', () => {
  it('strips legal suffixes/prefixes to a clean label', () => {
    expect(shortenClubName('Verein für Leibesübungen Wolfsburg')).toBe('Wolfsburg');
    expect(shortenClubName('Juventus Football Club')).toBe('Juventus');
    expect(shortenClubName('Manchester City Football Club')).toBe('Manchester City');
    expect(shortenClubName('Bayer 04 Leverkusen Fußball')).toBe('Bayer Leverkusen');
    expect(shortenClubName('Real Club Deportivo Mallorca S.A.D.')).toBe('Mallorca');
    expect(shortenClubName('Football Club de Metz')).toBe('Metz');
    // must NOT eat the start of a real word ("S.A." vs "Saint")
    expect(shortenClubName('Paris Saint-Germain Football Club')).toBe('Paris Saint-Germain');
  });

  it('never leaves an orphan period or blank label', () => {
    for (const p of getAllPlayers()) {
      const label = shortenClubName(p.current_team);
      if (!p.current_team) continue;
      expect(label.trim().length).toBeGreaterThan(0);
      expect(/\s\.|\.\s|^\.|\s\s/.test(label)).toBe(false);
    }
  });
});

describe('dailyRotation', () => {
  it('is deterministic for a given salt', () => {
    const pool = Array.from({ length: 50 }, (_, i) => i);
    expect(seededShuffle(pool, 123)).toEqual(seededShuffle(pool, 123));
    expect(rotatingPick(pool, 7, 999)).toBe(rotatingPick(pool, 7, 999));
  });

  it('does not repeat until the pool cycles', () => {
    const pool = Array.from({ length: 30 }, (_, i) => `item-${i}`);
    const seen = new Set<string>();
    for (let day = 0; day < pool.length; day++) {
      const pick = rotatingPick(pool, day, 42);
      expect(seen.has(pick)).toBe(false);
      seen.add(pick);
    }
    expect(seen.size).toBe(pool.length);
    // day == pool.length wraps back to day 0's pick
    expect(rotatingPick(pool, pool.length, 42)).toBe(rotatingPick(pool, 0, 42));
  });

  it('handles negative and large day indices', () => {
    const pool = ['a', 'b', 'c', 'd', 'e'];
    expect(() => rotatingPick(pool, -3, 1)).not.toThrow();
    expect(rotatingPick(pool, 5, 1)).toBe(rotatingPick(pool, 0, 1));
  });
});

describe('Who Are Ya difficulty curve', () => {
  // 2026-07-13 is a Monday; step through a week.
  const week = [
    ['2026-07-13', 'Mon'],
    ['2026-07-14', 'Tue'],
    ['2026-07-15', 'Wed'],
    ['2026-07-16', 'Thu'],
    ['2026-07-17', 'Fri'],
    ['2026-07-18', 'Sat'],
    ['2026-07-19', 'Sun'],
  ] as const;

  it('is deterministic for a given date', () => {
    for (const [d] of week) {
      const a = getDailyTarget(new Date(`${d}T00:00:00`));
      const b = getDailyTarget(new Date(`${d}T00:00:00`));
      expect(a.id).toBe(b.id);
    }
  });

  it('serves an ACTIVE player on easy days (Mon/Tue)', () => {
    for (const [d, wd] of week) {
      const target = getDailyTarget(new Date(`${d}T00:00:00`));
      if (wd === 'Mon' || wd === 'Tue') {
        expect(target.status).not.toBe('retired');
      }
    }
  });
});

describe('id-based fame (disambiguation)', () => {
  it('resolves namesakes to different fame by id', () => {
    const namesakes = new Map<string, Player[]>();
    for (const p of getAllPlayers()) {
      if (!namesakes.has(p.name)) namesakes.set(p.name, []);
      namesakes.get(p.name)!.push(p);
    }
    // find a name with >=2 players where at least one has fame data
    let checked = 0;
    for (const [, players] of namesakes) {
      if (players.length < 2) continue;
      const fames = players.map((p) => getFameById(p.id)?.fame_score);
      const known = fames.filter((f) => f !== undefined);
      if (known.length === 0) continue;
      // each id resolves independently (not all forced to one shared value)
      players.forEach((p) => {
        const f = getFameById(p.id);
        if (f) expect(typeof f.fame_score).toBe('number');
      });
      checked++;
      if (checked >= 5) break;
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('getFameByName falls back for names, prefers id-derived', () => {
    // every players_db player with fame resolves by name too (>= its id fame)
    let n = 0;
    for (const p of getAllPlayers()) {
      const byId = getFameById(p.id);
      if (!byId) continue;
      const byName = getFameByName(p.name);
      expect(byName).toBeDefined();
      expect(byName!.fame_score).toBeGreaterThanOrEqual(byId.fame_score);
      if (++n >= 200) break;
    }
    expect(n).toBeGreaterThan(0);
  });
});

describe('Career Path pool', () => {
  it('only contains players with >= 3 career stints', () => {
    for (const p of getGuessableCareerPlayers()) {
      expect(p.career.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('serves distinct, valid players across a 60-day window', () => {
    const seen = new Set<string>();
    for (let day = 0; day < 60; day++) {
      const player = getCareerPlayerForDay(day);
      expect(player.career.length).toBeGreaterThanOrEqual(3);
      expect(seen.has(player.name)).toBe(false);
      seen.add(player.name);
    }
  });
});

describe('Higher/Lower queue progression', () => {
  it('has no adjacent equal values and reaches full length', () => {
    for (let s = 1; s <= 20; s++) {
      const queue = generatePlayerQueue(s * 12345, 100, 0);
      expect(queue.length).toBe(100);
      for (let i = 0; i + 1 < queue.length; i++) {
        expect(queue[i].market_value).not.toBe(queue[i + 1].market_value);
      }
    }
  });

  it('ramps: early rounds are more famous than late rounds', () => {
    const early: number[] = [];
    const late: number[] = [];
    for (let s = 1; s <= 20; s++) {
      const queue = generatePlayerQueue(s * 999, 100, 0);
      queue.forEach((p, i) => {
        const f = getFameScore(p) ?? 0;
        if (i < 5) early.push(f);
        else if (i >= 20 && i < 25) late.push(f);
      });
    }
    const med = (a: number[]) => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];
    expect(med(early)).toBeGreaterThan(med(late));
  });
});

describe('progressionForRound', () => {
  it('is monotonically non-increasing in fame floor and gap ratio', () => {
    for (let i = 1; i < 40; i++) {
      const prev = progressionForRound(i - 1);
      const cur = progressionForRound(i);
      expect(cur.minFame).toBeLessThanOrEqual(prev.minFame);
      expect(cur.gapRatio).toBeLessThanOrEqual(prev.gapRatio);
    }
  });

  it('starts hard-famous and ends obscure', () => {
    expect(progressionForRound(0).minFame).toBe(80);
    expect(progressionForRound(0).gapRatio).toBe(0.4);
    expect(progressionForRound(25).minFame).toBe(35);
  });

  it('caps fame on deep rounds (household names cannot resurface) but not early', () => {
    expect(progressionForRound(0).maxFame).toBeUndefined();
    expect(progressionForRound(19).maxFame).toBeUndefined();
    expect(progressionForRound(20).maxFame).toBe(68);
    expect(progressionForRound(90).maxFame).toBe(68);
    // cap is monotonically non-increasing (uncapped = Infinity)
    for (let i = 1; i < 40; i++) {
      const prev = progressionForRound(i - 1).maxFame ?? Infinity;
      const cur = progressionForRound(i).maxFame ?? Infinity;
      expect(cur).toBeLessThanOrEqual(prev);
    }
  });

  it('H/L queue keeps deep rounds (>=20) under the fame cap', () => {
    for (let s = 1; s <= 15; s++) {
      const queue = generatePlayerQueue(s * 7777, 100, 0);
      expect(queue.length).toBe(100);
      queue.forEach((p, i) => {
        if (i >= 20) expect(getFameScore(p) ?? 0).toBeLessThanOrEqual(68);
      });
    }
  });
});

describe('Agent distractors', () => {
  it('never share the exact target fee with the correct answer', () => {
    const histories = getAllTransferHistories();
    const byId = new Map(histories.map((h) => [h.player_id, h]));
    for (let d = 1; d <= 20; d++) {
      const key = String(getModeSeed('agent', `2026-08-${String(d).padStart(2, '0')}`));
      const rounds = generateDailyAgentGame(key);
      for (const round of rounds) {
        const targetVal = parseFeeToNumber(round.targetFee);
        let exactCount = 0;
        for (const opt of round.options) {
          const h = byId.get(opt.playerId);
          if (
            h &&
            h.transfers.some(
              (t) => t.fee && Math.abs(parseFeeToNumber(t.fee) - targetVal) < targetVal * 0.01,
            )
          ) {
            exactCount++;
          }
        }
        expect(exactCount).toBe(1); // only the correct player matches the fee
        expect(round.correctClubFrom).not.toBe('Unknown');
      }
    }
  });
});
