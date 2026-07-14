import { CareerEntry } from '@/types/career';
import { getAllCareerPlayers } from './careerData';
import { rotatingPick, ROTATION_SALT } from './dailyRotation';
import { getFameByName } from './playerData';
import { getTodayDateString, seededShuffle } from './dailySeed';
import {
  bandForDate,
  filterByFameBand,
  resolveSkillTier,
  skillAdjustedBand,
} from './difficultyCurve';
import { shortenClubName } from './clubNames';

/**
 * Fixed number of hidden middle clubs. Kept equal to the screen's life count so
 * every daily puzzle has the same shape and scores are comparable day to day
 * (a puzzle that happened to hide 2 clubs was strictly easier than one hiding 4).
 */
export const HIDDEN_COUNT = 3;

export interface TimelineNode {
  club: string;
  from: number;
  to: number;
  isHidden: boolean;
  isGuessed: boolean;
  hintRevealed: boolean;
}

export interface CareerTimelinePuzzle {
  playerName: string;
  playerNationality: string;
  nodes: TimelineNode[];
  totalHidden: number;
}

function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    let t = (state += 0x6d2b79f5) | 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * @param seed    hash seed (drives which middle clubs are hidden)
 * @param dayIndex when provided (daily play), selects the player via a
 *   repeat-free rotation walk; when omitted (Play Again), the player is chosen
 *   randomly from the hash seed.
 */
export function generateCareerTimelinePuzzle(
  seed: number,
  dayIndex?: number,
  dateStr: string = getTodayDateString(),
): CareerTimelinePuzzle {
  const rng = seededRandom(seed);
  const allPlayers = getAllCareerPlayers();

  // Need first + last revealed and HIDDEN_COUNT hideable middles, so a career
  // must have at least HIDDEN_COUNT + 2 stints.
  const minStints = HIDDEN_COUNT + 2;
  const longEnough = allPlayers.filter((p) => p.career.length >= minStints);

  // Weekly difficulty band drives which players surface: household names early
  // week, deeper cuts on the weekend. filterByFameBand widens the fame window if
  // a band is too thin so the pool never empties.
  // Skill tier (neutral 0 without play history) shifts the fame window by at
  // most one step; filterByFameBand still widens so the pool never starves.
  const band = skillAdjustedBand(bandForDate(dateStr), resolveSkillTier('careertimeline'));
  const eligible = filterByFameBand(longEnough, band, (p) => getFameByName(p.name)?.fame_score);

  const player =
    dayIndex === undefined
      ? eligible[Math.floor(rng() * eligible.length)]
      : rotatingPick(eligible, dayIndex, ROTATION_SALT.careerTimeline);

  const nodes: TimelineNode[] = player.career.map((entry: CareerEntry) => ({
    club: entry.club,
    from: entry.from,
    to: entry.to,
    isHidden: false,
    isGuessed: false,
    hintRevealed: false,
  }));

  // Always reveal first and last; hide a FIXED count of middle clubs chosen with
  // an unbiased seeded shuffle (never a random-comparator sort).
  const middleIndices: number[] = [];
  for (let i = 1; i < nodes.length - 1; i++) middleIndices.push(i);
  const toHide = seededShuffle(middleIndices, rng).slice(0, HIDDEN_COUNT);
  for (const idx of toHide) nodes[idx].isHidden = true;

  const totalHidden = nodes.filter((n) => n.isHidden).length;

  return {
    playerName: player.name,
    playerNationality: player.nationality,
    nodes,
    totalHidden,
  };
}

export function getClubHint(club: string): string {
  const firstLetter = club.charAt(0).toUpperCase();
  const wordCount = club.split(/\s+/).length;
  const blanks = '_ '.repeat(club.length - 1).trim();
  if (wordCount > 1) {
    return `${firstLetter}${blanks} (${wordCount} words)`;
  }
  return `${firstLetter}${blanks}`;
}

function normalize(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Canonical club key: strip legal/organizational suffixes (shared shortener),
 * fold diacritics, lowercase. Two spellings of the SAME club collapse to one
 * key; two DIFFERENT clubs never do — the old substring/prefix matching let
 * "Real Sociedad" satisfy a "Real Madrid" target, which this removes.
 */
function canonical(name: string): string {
  return normalize(shortenClubName(name));
}

/**
 * Curated synonym sets — ONLY explicit, human-verified equivalents. There is no
 * substring, prefix, or "contains" matching: a guess matches a target iff their
 * canonical keys are identical or they share one of these groups.
 */
const ALIAS_GROUPS: string[][] = [
  ['manchester united', 'man united', 'man utd'],
  ['manchester city', 'man city'],
  ['paris saint-germain', 'psg'],
  ['fc barcelona', 'barcelona', 'barca'],
  ['bayern munich', 'bayern munchen', 'fc bayern munich'],
  ['inter milan', 'inter', 'internazionale'],
  ['tottenham hotspur', 'tottenham', 'spurs'],
  ['atletico madrid', 'atletico de madrid'],
  ['juventus', 'juve'],
  ['wolverhampton wanderers', 'wolves'],
];

// canonical alias key -> group id, for O(1) equivalence checks.
const aliasGroupId = new Map<string, number>();
ALIAS_GROUPS.forEach((group, i) => {
  for (const name of group) aliasGroupId.set(canonical(name), i);
});

export function clubNamesMatch(guess: string, target: string): boolean {
  const g = canonical(guess);
  const t = canonical(target);
  if (!g || !t) return false;
  if (g === t) return true;
  const gi = aliasGroupId.get(g);
  const ti = aliasGroupId.get(t);
  return gi !== undefined && gi === ti;
}

let cachedClubs: { name: string; normalizedName: string }[] | null = null;

export function getAllClubs(): { name: string; normalizedName: string }[] {
  if (cachedClubs) return cachedClubs;

  const clubSet = new Set<string>();
  const allPlayers = getAllCareerPlayers();

  for (const player of allPlayers) {
    for (const entry of player.career) {
      clubSet.add(entry.club);
    }
  }

  cachedClubs = Array.from(clubSet)
    .sort()
    .map((name) => ({
      name,
      normalizedName: normalize(name),
    }));

  return cachedClubs;
}
