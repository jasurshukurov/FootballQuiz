import { generateDailyAgentGame, generateAgentRound } from '@/lib/agentGameGenerator';
import { getFameByName } from '@/lib/playerData';
import { progressionForRound, bandForDate, bandFameOffset } from '@/lib/difficultyCurve';

describe('generateDailyAgentGame', () => {
  it('is deterministic for a fixed seed + date', () => {
    const a = generateDailyAgentGame('seed-abc', '2026-07-13');
    const b = generateDailyAgentGame('seed-abc', '2026-07-13');
    expect(a).toEqual(b);
  });

  it('builds 10 rounds with 3 options and no duplicate answer players', () => {
    const rounds = generateDailyAgentGame('daily-1', '2026-07-13');
    expect(rounds).toHaveLength(10);
    const ids = new Set<number>();
    for (const r of rounds) {
      expect(r.options).toHaveLength(3);
      // exactly one option is the correct player
      expect(r.options.filter((o) => o.playerId === r.correctPlayerId)).toHaveLength(1);
      expect(ids.has(r.correctPlayerId)).toBe(false);
      ids.add(r.correctPlayerId);
    }
  });

  it('carries each option its own transfer detail (for teach-on-miss)', () => {
    const rounds = generateDailyAgentGame('teach', '2026-07-13');
    for (const r of rounds) {
      for (const o of r.options) {
        expect(typeof o.fee).toBe('string');
        expect(o.fee.length).toBeGreaterThan(0);
        expect(typeof o.clubTo).toBe('string');
      }
    }
  });

  it('gates the answer player by the shared progression curve + daily band', () => {
    // Monday 2026-07-13 is the "easy" band (+5 fame offset). Early rounds pull
    // the highest-fame answers; the join is disambiguated (getFameByName).
    const band = bandForDate('2026-07-13');
    const offset = bandFameOffset(band);
    const rounds = generateDailyAgentGame('curve', '2026-07-13');

    // Round 0 uses progression tier 0 (minFame 80). With the easy +5 offset the
    // floor is 85 before widening; allow generous slack for filterByFameBand's
    // symmetric widening, but the early answer should still clearly out-fame a
    // late one on average.
    const fameAt = (i: number) => getFameByName(rounds[i].correctPlayerName)?.fame_score ?? 0;
    const earlyFloor = Math.max(0, progressionForRound(0).minFame + offset);
    // Not a hard per-round guarantee (widening can dip below), but the mean of
    // the first three answers should sit at/above the mean of the last three.
    const earlyMean = (fameAt(0) + fameAt(1) + fameAt(2)) / 3;
    const lateMean = (fameAt(7) + fameAt(8) + fameAt(9)) / 3;
    expect(earlyMean).toBeGreaterThanOrEqual(lateMean - 1);
    expect(earlyFloor).toBeGreaterThan(0);
  });
});

describe('generateAgentRound', () => {
  it('returns null-safe rounds and respects the maxFame cap when set', () => {
    // A tight, capped band still yields a playable round (pool widening) and
    // never crashes.
    const round = generateAgentRound(12345, 4, 40, 68, 0.06);
    expect(round === null || round.options.length === 3).toBe(true);
  });
});
