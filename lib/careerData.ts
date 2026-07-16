import { CareerPlayer, DifficultyTier } from '@/types/career';
import { Player } from '@/types/player';
import { getDailyNumber } from './dailyPuzzle';
import { rotatingPick, ROTATION_SALT } from './dailyRotation';
import { getAllPlayers, getFameForPlayer, getFameByName } from './playerData';
import {
  bandForDate,
  filterByFameBand,
  resolveSkillTier,
  skillAdjustedBand,
} from './difficultyCurve';

const careerData = require('@/data/career_paths.json') as CareerPlayer[];

/** Minimum career stints for a fair Career Path puzzle (need clubs to scramble). */
const MIN_CAREER_STINTS = 3;

/**
 * Career Path player carrying its resolved fame score so the daily pick can be
 * difficulty-banded. `fameScore` is undefined only for players absent from every
 * fame source (they sink to the bottom of a band and are filtered out first).
 */
export interface RankedCareerPlayer extends CareerPlayer {
  fameScore?: number;
}

// Map fame_scores tier names ("Beginner", "Semi-Pro") to DifficultyTier type
const FAME_TIER_MAP: Record<string, DifficultyTier> = {
  Beginner: 'beginner',
  Amateur: 'amateur',
  'Semi-Pro': 'semi_pro',
  Professional: 'professional',
  'World Class': 'world_class',
  Legendary: 'legendary',
  Ultimate: 'legendary',
};

// Invert quality tier to difficulty for players without fame data.
// "legendary" quality player = easiest to guess = "beginner" difficulty
const QUALITY_TO_DIFFICULTY: Record<DifficultyTier, DifficultyTier> = {
  legendary: 'beginner',
  world_class: 'amateur',
  professional: 'semi_pro',
  semi_pro: 'professional',
  amateur: 'world_class',
  beginner: 'legendary',
};

let cached: RankedCareerPlayer[] | null = null;
let dbByNormName: Map<string, Player> | null = null;

/** players_db rows keyed by normalized name, keeping the most-famous namesake. */
function getDbByNormName(): Map<string, Player> {
  if (!dbByNormName) {
    dbByNormName = new Map();
    for (const p of getAllPlayers()) {
      const key = p.normalized_name;
      if (!key) continue;
      const cur = dbByNormName.get(key);
      if (!cur) {
        dbByNormName.set(key, p);
        continue;
      }
      // Prefer the namesake with the higher id-based fame so the career player
      // (identified only by name) inherits the star's fame, not an obscure twin.
      const curFame = getFameForPlayer(cur)?.fame_score ?? -1;
      const pFame = getFameForPlayer(p)?.fame_score ?? -1;
      if (pFame > curFame) dbByNormName.set(key, p);
    }
  }
  return dbByNormName;
}

function buildCache(): RankedCareerPlayer[] {
  // career_paths ids don't match players_db ids. Prefer the id-based
  // (disambiguated) fame join for players present in players_db, and fall back
  // to the name-keyed helper only for legends the DB doesn't carry.
  const byName = getDbByNormName();
  return careerData.map((p) => {
    const nn = p.normalized_name || p.name.toLowerCase();
    const dbPlayer = byName.get(nn);
    const fame = dbPlayer ? getFameForPlayer(dbPlayer) : getFameByName(p.name);
    const fameTier = fame ? FAME_TIER_MAP[fame.difficulty_tier] : undefined;
    const difficultyTier = fameTier ?? QUALITY_TO_DIFFICULTY[p.tier] ?? 'professional';
    return { ...p, tier: difficultyTier, fameScore: fame?.fame_score };
  });
}

export function getAllCareerPlayers(): RankedCareerPlayer[] {
  if (!cached) cached = buildCache();
  return cached;
}

/** Resolved fame score for a Career Path player (undefined if unknown). */
export function getCareerFameScore(p: CareerPlayer): number | undefined {
  return (p as RankedCareerPlayer).fameScore;
}

export function getCareerPlayersByTier(tier: DifficultyTier): RankedCareerPlayer[] {
  return getAllCareerPlayers().filter((p) => p.tier === tier);
}

export function getRandomCareerPlayer(
  tier?: DifficultyTier,
  excludeIds?: readonly number[],
): CareerPlayer {
  const pool = getGuessableCareerPlayers(tier);
  // Endless "Next" must feel fresh: skip recently dealt players. Only fall
  // back to the full pool when the exclusion would empty it (tiny tier pools).
  const exclude = new Set(excludeIds ?? []);
  const fresh = pool.filter((p) => !exclude.has(p.id));
  const candidates = fresh.length > 0 ? fresh : pool;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export function getDailyCareerPlayer(dayNumber: number): CareerPlayer {
  const players = getAllCareerPlayers();
  return players[dayNumber % players.length];
}

/** Players with enough career stints to make a real scramble puzzle. */
export function getGuessableCareerPlayers(tier?: DifficultyTier): RankedCareerPlayer[] {
  const pool = tier ? getCareerPlayersByTier(tier) : getAllCareerPlayers();
  const filtered = pool.filter((p) => (p.career?.length ?? 0) >= MIN_CAREER_STINTS);
  // Never let the length filter empty the pool (would crash the daily).
  return filtered.length > 0 ? filtered : pool;
}

/**
 * The day's difficulty-banded guessable pool: famous careers early in the week,
 * deep cuts by Saturday. filterByFameBand widens the band symmetrically until at
 * least `minPool` players remain, so a narrow band can never starve the rotation.
 */
export function getBandedCareerPool(dateStr?: string, tier?: DifficultyTier): RankedCareerPlayer[] {
  const base = getGuessableCareerPlayers(tier);
  // Skill tier (neutral 0 without play history) shifts the fame window by at
  // most one step; filterByFameBand still widens so the pool never starves.
  const band = skillAdjustedBand(bandForDate(dateStr), resolveSkillTier('careerpath'));
  return filterByFameBand(base, band, (p) => p.fameScore, 25);
}

/** Parse a local YYYY-MM-DD string to a Date (matches how screens key dates). */
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map((v) => parseInt(v, 10));
  return new Date(y, (m || 1) - 1, d || 1);
}

/**
 * Deterministic no-repeat daily pick, indexed by absolute day number so the
 * same player never recurs until the (band) pool cycles. Band-less: exposed for
 * tests / QA that walk raw day indices without a calendar date.
 */
export function getCareerPlayerForDay(dayIndex: number, tier?: DifficultyTier): CareerPlayer {
  const pool = getGuessableCareerPlayers(tier);
  return rotatingPick(pool, dayIndex, ROTATION_SALT.careerPath);
}

/**
 * Deterministic band-gated daily pick for a calendar date. The band pool is
 * salted per band so adjacent days (whose bands overlap in fame) don't line up
 * their permutations and re-serve the same player; within a band the rotation
 * is repeat-free until the pool cycles.
 */
export function getCareerPlayerForDate(dateStr: string, tier?: DifficultyTier): CareerPlayer {
  // Same skill adjustment as getBandedCareerPool so the salt (band.min) always
  // matches the pool it walks. Tier 0 returns the identical band object.
  const band = skillAdjustedBand(bandForDate(dateStr), resolveSkillTier('careerpath'));
  const pool = getBandedCareerPool(dateStr, tier);
  const dayIndex = getDailyNumber(parseLocalDate(dateStr));
  return rotatingPick(pool, dayIndex, ROTATION_SALT.careerPath ^ band.min);
}

/**
 * Deterministically pick today's Career Path player. The `seed` argument
 * (getModeSeed('careerpath')) is retained for call-site compatibility and to
 * feed the scramble RNG; player SELECTION uses the band-gated day rotation so it
 * is repeat-free, difficulty-curved (Mon famous -> Sat deep cuts) and >= 3
 * stints. Career Path only ever runs for "today" (Play Again uses
 * getRandomCareerPlayer), so deriving today's date here is safe.
 */
export function getSeededCareerPlayer(_seed: number, tier?: DifficultyTier): CareerPlayer {
  return getCareerPlayerForDate(getTodayDateStr(), tier);
}

function getTodayDateStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
