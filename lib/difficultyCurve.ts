/**
 * Shared weekly difficulty curve for all daily modes.
 *
 * Daily puzzle games retain best when challenge rises through the week
 * (flow-channel: easy Monday warm-ups building to a hard Saturday, Sunday
 * wildcard) instead of uniform-random difficulty. Fame score (0-100 from
 * data/fame_scores.json) is our difficulty axis: higher fame = easier.
 *
 * Generators consume this via bandForDate() + filterByFameBand() so the
 * whole app shares one curve definition.
 */

export interface FameBand {
  /** Inclusive lower fame bound. */
  min: number;
  /** Exclusive upper fame bound (101 = uncapped). */
  max: number;
  label: 'easy' | 'medium' | 'hard' | 'expert' | 'wildcard';
}

/** Monday=1 ... Sunday=0 (JS getDay()). */
const WEEKLY_BANDS: Record<number, FameBand> = {
  1: { min: 85, max: 101, label: 'easy' }, // Mon — household names
  2: { min: 78, max: 96, label: 'easy' }, // Tue
  3: { min: 72, max: 90, label: 'medium' }, // Wed
  4: { min: 66, max: 85, label: 'medium' }, // Thu
  5: { min: 62, max: 80, label: 'hard' }, // Fri
  6: { min: 58, max: 72, label: 'expert' }, // Sat — the weekly summit
  0: { min: 50, max: 101, label: 'wildcard' }, // Sun — anything goes
};

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map((v) => parseInt(v, 10));
  return new Date(y, (m || 1) - 1, d || 1);
}

/** Band for a local YYYY-MM-DD date string (defaults to today). */
export function bandForDate(dateStr?: string): FameBand {
  const date = dateStr ? parseLocalDate(dateStr) : new Date();
  return WEEKLY_BANDS[date.getDay()];
}

/**
 * Filter items to the band, widening symmetrically until at least
 * `minPool` candidates remain so a narrow band can never empty a mode's
 * player pool (an empty pool is a crash, not a difficulty setting).
 */
export function filterByFameBand<T>(
  items: T[],
  band: FameBand,
  getFame: (item: T) => number | undefined,
  minPool = 25,
): T[] {
  let { min, max } = band;
  let pool: T[] = [];
  while (min > 0 || max < 101) {
    pool = items.filter((it) => {
      const fame = getFame(it);
      return fame !== undefined && fame >= min && fame < max;
    });
    if (pool.length >= minPool) return pool;
    min = Math.max(0, min - 5);
    max = Math.min(101, max + 5);
  }
  return items.filter((it) => getFame(it) !== undefined);
}

// ---------------------------------------------------------------------------
// In-session progression (streak-based difficulty ramp)
// ---------------------------------------------------------------------------
// Within a single run, difficulty rises with the streak position: early rounds
// pull famous players with big, obvious gaps; later rounds pull obscure players
// with tight gaps. The streak index is the difficulty dial. Fame floors are
// tuned so no tier starves the mv>=1M / transfer pools (verified 71/295/738/
// 1525/3774 players at fame>=80/70/60/50/35).

export interface RoundProgression {
  /** Minimum fame_score for the round's featured player. */
  minFame: number;
  /**
   * Maximum fame_score for the round's featured player, or undefined = uncapped.
   * Deep rounds cap fame so household names can't resurface once a run has gone
   * long (a superstar deep in a streak breaks the "getting harder" feel). Early
   * tiers stay uncapped — their floors already exclude the obscure.
   */
  maxFame?: number;
  /** Minimum relative value/fee gap so the guess stays decisive. */
  gapRatio: number;
}

const PROGRESSION_TIERS: {
  untilRound: number;
  minFame: number;
  maxFame?: number;
  gapRatio: number;
}[] = [
  { untilRound: 5, minFame: 80, gapRatio: 0.4 },
  { untilRound: 10, minFame: 70, gapRatio: 0.25 },
  { untilRound: 15, minFame: 60, gapRatio: 0.15 },
  { untilRound: 20, minFame: 50, gapRatio: 0.1 },
  { untilRound: Infinity, minFame: 35, maxFame: 68, gapRatio: 0.06 },
];

/** Difficulty target for a 0-based round/streak index (monotonically harder). */
export function progressionForRound(roundIndex: number): RoundProgression {
  const i = Math.max(0, Math.floor(roundIndex));
  const tier =
    PROGRESSION_TIERS.find((t) => i < t.untilRound) ??
    PROGRESSION_TIERS[PROGRESSION_TIERS.length - 1];
  return { minFame: tier.minFame, maxFame: tier.maxFame, gapRatio: tier.gapRatio };
}

/**
 * Daily-band fame offset applied to the progression's fame floor: easy days are
 * a touch more forgiving (+5, more famous), expert days harder (-10).
 */
export function bandFameOffset(band: FameBand): number {
  switch (band.label) {
    case 'easy':
      return 5;
    case 'hard':
      return -5;
    case 'expert':
      return -10;
    case 'medium':
    case 'wildcard':
    default:
      return 0;
  }
}
