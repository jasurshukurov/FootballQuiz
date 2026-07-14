import { Player } from '@/types/player';
import { DifficultyTier } from '@/types/career';
import { getAllPlayers, getPlayerById, getFameForPlayer, FameInfo } from './playerData';
import {
  bandForDate,
  filterByFameBand,
  resolveSkillTier,
  skillAdjustedBand,
} from './difficultyCurve';
import { rotatingPick, ROTATION_SALT } from './dailyRotation';

const playerAgesJson = require('@/data/player_ages.json') as Record<string, string>;

const EPOCH = new Date('2025-01-01T00:00:00Z');

const FAME_TIER_MAP: Record<string, DifficultyTier> = {
  Beginner: 'beginner',
  Amateur: 'amateur',
  'Semi-Pro': 'semi_pro',
  Professional: 'professional',
  'World Class': 'world_class',
  Legendary: 'legendary',
};

let cachedFamousPlayers: Player[] | null = null;

export function getFamousPlayers(): Player[] {
  if (!cachedFamousPlayers) {
    // id-based (disambiguated) fame: a namesake no longer inherits a star's fame.
    const filtered = getAllPlayers().filter((p) => {
      const fame = getFameForPlayer(p);
      return fame != null && fame.fame_score >= 55;
    });
    // If the fame join ever breaks (renamed/empty data file), fall back to the
    // full roster so getDailyTarget() still returns a player instead of crashing.
    cachedFamousPlayers = filtered.length > 0 ? filtered : getAllPlayers();
  }
  return cachedFamousPlayers;
}

function getPlayerFame(player: Player): FameInfo | undefined {
  return getFameForPlayer(player);
}

export function getPlayerDifficultyTier(playerId: number): DifficultyTier | null {
  const player = getPlayerById(playerId);
  if (!player) return null;
  const fame = getPlayerFame(player);
  return fame ? (FAME_TIER_MAP[fame.difficulty_tier] ?? null) : null;
}

export function getPlayerAge(playerId: number): number | null {
  const dob = playerAgesJson[String(playerId)];
  if (!dob) return null;
  // DOB strings are "YYYY-MM-DD HH:MM:SS"; Hermes' Date parser can't handle the
  // space separator and returns NaN, so parse the date parts manually.
  const [y, m, d] = dob.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  const birthMs = Date.UTC(y, m - 1, d);
  if (Number.isNaN(birthMs)) return null;
  const age = Math.floor((Date.now() - birthMs) / (365.25 * 24 * 60 * 60 * 1000));
  return Number.isNaN(age) ? null : age;
}

export function getDailyNumber(date: Date = new Date()): number {
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const diffMs = utcDate.getTime() - EPOCH.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/** YYYY-MM-DD from a Date's local calendar parts (matches how screens key dates). */
function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** The day's band pool, biased to active players on easy days. */
function whoAreYaPool(band: ReturnType<typeof bandForDate>): Player[] {
  const famous = getFamousPlayers();
  const getFame = (p: Player) => getPlayerFame(p)?.fame_score;
  // Easy days (Mon/Tue) bias toward ACTIVE players — a famous retired legend is
  // a harder recall than a current star, which belongs mid-week/weekend. Filter
  // to active FIRST, then let the band widen over the active pool so we keep a
  // healthy, all-active pool instead of falling back to retired legends.
  const basePool = band.label === 'easy' ? famous.filter((p) => p.status !== 'retired') : famous;
  const pool = filterByFameBand(basePool, band, getFame);
  return pool.length > 0 ? pool : famous;
}

/** Deterministic un-deduplicated pick for a date (rotation walk, +bump index). */
function rawDailyTarget(date: Date, bump: number): Player {
  // Skill tier (neutral 0 without play history) shifts the fame window by at
  // most one step. Prior-day picks in getDailyTarget's dedup window are
  // reconstructed with the same (current) tier, so the no-recent-repeat check
  // stays exact whenever the tier is stable across the window.
  const band = skillAdjustedBand(bandForDate(toDateStr(date)), resolveSkillTier('who-are-ya'));
  const source = whoAreYaPool(band);
  // Salt the shuffle per band so adjacent bands (which overlap in fame) don't
  // line up their permutations and re-serve the same player on consecutive days.
  return rotatingPick(source, getDailyNumber(date) + bump, ROTATION_SALT.whoAreYa ^ band.min);
}

const RECENT_WINDOW = 6; // no target may repeat within this many days

export function getDailyTarget(date: Date = new Date()): Player {
  // Adjacent difficulty bands overlap in fame, so two nearby days can otherwise
  // rotate onto the same player. Reject any pick used in the previous
  // RECENT_WINDOW days (comparing against those days' base picks) by advancing
  // within today's own permutation — deterministic and non-recursive.
  const recent = new Set<number>();
  for (let k = 1; k <= RECENT_WINDOW; k++) {
    const prior = new Date(date.getTime() - k * 86_400_000);
    recent.add(rawDailyTarget(prior, 0).id);
  }
  for (let bump = 0; bump <= 16; bump++) {
    const cand = rawDailyTarget(date, bump);
    if (!recent.has(cand.id)) return cand;
  }
  return rawDailyTarget(date, 0);
}

export function getRandomTarget(): Player {
  const players = getFamousPlayers();
  const index = Math.floor(Math.random() * players.length);
  return players[index];
}
