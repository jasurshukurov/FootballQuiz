// Adaptive, score-based difficulty: EWMA skill ratings (hooks/useSkillStore)
// resolve to bounded tiers that nudge the shared difficulty curve.
//
// The skill store is a zustand `persist` store backed by AsyncStorage (no node
// implementation), and useDailyProgressStore drags in native-only modules —
// mock the lot so the imports are pure. (Same pattern as useManagerStore.test.)
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
  },
}));
jest.mock('@/lib/notifications', () => ({
  scheduleNextDayReminder: jest.fn(() => Promise.resolve()),
}));
jest.mock('@/hooks/useDailyStateStore', () => ({
  useDailyStateStore: { getState: () => ({ keepStreak: jest.fn(), currentStreak: 1 }) },
}));
jest.mock('@/hooks/useRemoteConfigStore', () => ({
  useRemoteConfigStore: { getState: () => ({ config: { disabled_modes: [] } }) },
}));

/* eslint-disable import/first -- mocks must be registered before these imports. */
import { useSkillStore, skillTierForMode } from '@/hooks/useSkillStore';
import { useDailyProgressStore } from '@/hooks/useDailyProgressStore';
import {
  bandForDate,
  progressionForRound,
  resolveSkillTier,
  skillAdjustedBand,
  SkillTier,
} from '@/lib/difficultyCurve';
import { generateBlindRankingPuzzle } from '@/lib/blindRankingGenerator';
import { generateDailyAgentGame } from '@/lib/agentGameGenerator';
import { getDailyMatch, getPlayableMatches } from '@/lib/matchData';
import { getTodayDateString } from '@/lib/dailySeed';
/* eslint-enable import/first */

const YESTERDAY_STAMP = '2000-01-01'; // any non-today stamp

function resetSkillStore(
  ratings: Record<string, number> = {},
  dayStamp: string | null = null,
  dayStartRatings: Record<string, number> = {},
) {
  useSkillStore.setState({ ratings, dayStartRatings, dayStamp });
}

/** Put a rating in place so it is ALREADY effective today (recorded on a prior day). */
function setEffectiveRating(mode: string, rating: number) {
  resetSkillStore({ [mode]: rating }, YESTERDAY_STAMP);
}

afterEach(() => resetSkillStore());

// ---------------------------------------------------------------------------
// EWMA math
// ---------------------------------------------------------------------------
describe('recordResult EWMA', () => {
  it('starts from the 0.5 prior on the first result', () => {
    resetSkillStore();
    useSkillStore.getState().recordResult('agent', 10, 10);
    expect(useSkillStore.getState().ratings.agent).toBeCloseTo(0.7 * 0.5 + 0.3 * 1, 10);
  });

  it('blends subsequent results at 30%', () => {
    resetSkillStore();
    const store = useSkillStore.getState();
    store.recordResult('agent', 10, 10); // 0.65
    store.recordResult('agent', 5, 10); // 0.7*0.65 + 0.3*0.5
    expect(useSkillStore.getState().ratings.agent).toBeCloseTo(0.7 * 0.65 + 0.3 * 0.5, 10);
  });

  it('clamps score/maxScore into [0, 1] (streak soft caps)', () => {
    resetSkillStore();
    useSkillStore.getState().recordResult('higherlower', 37, 10); // over the cap
    expect(useSkillStore.getState().ratings.higherlower).toBeCloseTo(0.65, 10);
    useSkillStore.getState().recordResult('marketmovers', -3, 10);
    expect(useSkillStore.getState().ratings.marketmovers).toBeCloseTo(0.35, 10);
  });

  it('ignores invalid input', () => {
    resetSkillStore();
    const store = useSkillStore.getState();
    store.recordResult('agent', 5, 0);
    store.recordResult('agent', NaN, 10);
    store.recordResult('agent', 5, Infinity);
    expect(useSkillStore.getState().ratings.agent).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Tier thresholds + day-start snapshot
// ---------------------------------------------------------------------------
describe('getSkillTier', () => {
  it.each<[number, SkillTier]>([
    [0.1, -1],
    [0.349, -1],
    [0.35, 0],
    [0.5, 0],
    [0.75, 0],
    [0.751, 1],
    [0.95, 1],
  ])('rating %f -> tier %i', (rating, tier) => {
    setEffectiveRating('agent', rating);
    expect(useSkillStore.getState().getSkillTier('agent')).toBe(tier);
    expect(skillTierForMode('agent')).toBe(tier);
    expect(resolveSkillTier('agent')).toBe(tier); // registered lib provider
  });

  it('defaults to 0 for modes with no history (fresh install / E2E)', () => {
    resetSkillStore();
    expect(skillTierForMode('missing11')).toBe(0);
    expect(resolveSkillTier('missing11')).toBe(0);
  });

  it("today's results only take effect tomorrow (day-start snapshot)", () => {
    resetSkillStore();
    // Perfect scores recorded TODAY: rating climbs but the day's tier is frozen
    // at the day-start (empty) snapshot, so today's puzzles cannot flip mid-day.
    for (let i = 0; i < 10; i++) useSkillStore.getState().recordResult('agent', 10, 10);
    expect(useSkillStore.getState().ratings.agent).toBeGreaterThan(0.75);
    expect(skillTierForMode('agent')).toBe(0);
    // Simulate the calendar rolling over: the stamp is no longer today, so the
    // full ratings become effective.
    useSkillStore.setState({ dayStamp: YESTERDAY_STAMP });
    expect(skillTierForMode('agent')).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Daily recording (useDailyProgressStore -> skill store)
// ---------------------------------------------------------------------------
describe('daily completion recording', () => {
  beforeEach(() => {
    resetSkillStore();
    useDailyProgressStore.setState({
      date: getTodayDateString(),
      completedModes: {},
      scoresByMode: {},
      perfectDays: 0,
      lastPerfectDate: null,
    });
  });

  it('feeds the FIRST daily completion and ignores same-day practice replays', () => {
    useDailyProgressStore.getState().markCompleted('agent', 10);
    const after = useSkillStore.getState().ratings.agent;
    expect(after).toBeCloseTo(0.65, 10);
    // Play-Again replay the same day: scoresByMode keeps the first score and
    // the skill rating must not move either.
    useDailyProgressStore.getState().markCompleted('agent', 0);
    expect(useSkillStore.getState().ratings.agent).toBeCloseTo(after, 10);
  });

  it('inverts who-are-ya (fewer guesses = better, 0 = loss)', () => {
    useDailyProgressStore.getState().markCompleted('who-are-ya', 1); // 1-guess win
    expect(useSkillStore.getState().ratings['who-are-ya']).toBeCloseTo(0.65, 10); // norm 1
    resetSkillStore();
    useDailyProgressStore.setState({ completedModes: {}, scoresByMode: {} });
    useDailyProgressStore.getState().markCompleted('who-are-ya', 0); // loss
    expect(useSkillStore.getState().ratings['who-are-ya']).toBeCloseTo(0.35, 10); // norm 0
  });

  it('never records a completion without a score', () => {
    useDailyProgressStore.getState().markCompleted('agent');
    expect(useSkillStore.getState().ratings.agent).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Bounded band / progression shifts
// ---------------------------------------------------------------------------
describe('skillAdjustedBand', () => {
  const WEEK = [
    '2026-07-13',
    '2026-07-14',
    '2026-07-15',
    '2026-07-16',
    '2026-07-17',
    '2026-07-18',
    '2026-07-19',
  ]; // Mon..Sun

  it('tier 0 returns the SAME band object (identity, for salted rotations)', () => {
    for (const day of WEEK) {
      const band = bandForDate(day);
      expect(skillAdjustedBand(band, 0)).toBe(band);
    }
  });

  it('shifts at most one step and stays inside the global fame bounds', () => {
    for (const day of WEEK) {
      const band = bandForDate(day);
      for (const tier of [-1, 1] as const) {
        const adj = skillAdjustedBand(band, tier);
        expect(adj.min).toBeGreaterThanOrEqual(35);
        expect(adj.max).toBeLessThanOrEqual(101);
        expect(adj.min).toBeLessThan(adj.max);
        expect(Math.abs(adj.min - band.min)).toBeLessThanOrEqual(6);
        expect(Math.abs(adj.max - band.max)).toBeLessThanOrEqual(6);
        // +1 skill -> harder (window moves down); -1 -> easier (up).
        if (tier === 1) expect(adj.min).toBeLessThanOrEqual(band.min);
        else expect(adj.min).toBeGreaterThanOrEqual(band.min);
        expect(adj.label).toBe(band.label);
      }
    }
  });
});

describe('progressionForRound with skill', () => {
  it('tier 0 (and the default) is exactly the current curve', () => {
    for (let i = 0; i < 30; i++) {
      expect(progressionForRound(i, 0)).toEqual(progressionForRound(i));
    }
  });

  it('+1 advances the ramp two rounds, -1 retreats it (floored at round 0)', () => {
    for (let i = 0; i < 30; i++) {
      expect(progressionForRound(i, 1)).toEqual(progressionForRound(i + 2));
      expect(progressionForRound(i, -1)).toEqual(progressionForRound(Math.max(0, i - 2)));
    }
  });

  it('fame floors stay inside the tier table bounds for every tier', () => {
    for (let i = 0; i < 40; i++) {
      for (const tier of [-1, 0, 1] as const) {
        const prog = progressionForRound(i, tier);
        expect(prog.minFame).toBeGreaterThanOrEqual(35);
        expect(prog.minFame).toBeLessThanOrEqual(80);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Neutral-default identity + pool viability at the generator level
// ---------------------------------------------------------------------------
describe('generator neutrality and viability', () => {
  const DATE = '2026-07-18'; // Saturday — the narrowest (expert) band

  it('empty store and mid (tier-0) rating produce identical puzzles', () => {
    resetSkillStore();
    const fresh = generateBlindRankingPuzzle(123456, DATE);
    const freshAgent = generateDailyAgentGame('987654', DATE);
    setEffectiveRating('blindranking', 0.5);
    setEffectiveRating('agent', 0.5);
    expect(generateBlindRankingPuzzle(123456, DATE)).toEqual(fresh);
    expect(generateDailyAgentGame('987654', DATE)).toEqual(freshAgent);
  });

  it('a hot streak (+1) still yields a full, viable puzzle', () => {
    resetSkillStore({ blindranking: 0.9, agent: 0.9 }, YESTERDAY_STAMP);
    const puzzle = generateBlindRankingPuzzle(123456, DATE);
    expect(puzzle.players).toHaveLength(5);
    expect(generateDailyAgentGame('987654', DATE)).toHaveLength(10);
  });

  it('a cold streak (-1) still yields a full, viable puzzle', () => {
    resetSkillStore({ blindranking: 0.1, agent: 0.1 }, YESTERDAY_STAMP);
    expect(generateBlindRankingPuzzle(123456, DATE).players).toHaveLength(5);
    expect(generateDailyAgentGame('987654', DATE)).toHaveLength(10);
  });
});

describe('Missing XI skill nudge', () => {
  it('is a soft reorder: neutral and +1 draw from the same pool, no repeats in 60 days', () => {
    const playable = new Set(getPlayableMatches().map((m) => m.match_id));

    resetSkillStore();
    const neutralIds: string[] = [];
    for (let day = 100; day < 160; day++) neutralIds.push(getDailyMatch(day).match_id);

    setEffectiveRating('missing11', 0.9);
    const hardIds: string[] = [];
    for (let day = 100; day < 160; day++) hardIds.push(getDailyMatch(day).match_id);

    for (const ids of [neutralIds, hardIds]) {
      expect(new Set(ids).size).toBe(60); // no-repeat guarantee survives
      for (const id of ids) expect(playable.has(id)).toBe(true); // pool never shrinks
    }
  });

  it('tier 0 serves the exact current match', () => {
    resetSkillStore();
    const a = getDailyMatch(250).match_id;
    setEffectiveRating('missing11', 0.5); // tier 0
    expect(getDailyMatch(250).match_id).toBe(a);
  });
});
