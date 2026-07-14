import { CareerEntry, CareerPlayer } from '@/types/career';
import { Player } from '@/types/player';
import { Rank, getRank } from '@/lib/rankLadder';
import { getAllCareerPlayers } from '@/lib/careerData';
import { getAllPlayers } from '@/lib/playerData';

/** Fisher-Yates shuffle that guarantees a different order */
export function scrambleCareer(career: CareerEntry[]): CareerEntry[] {
  if (career.length <= 1) return [...career];

  const shuffled = [...career];
  let isSameOrder = true;

  while (isSameOrder) {
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    isSameOrder = shuffled.every((entry, idx) => entry.club === career[idx].club);
  }

  return shuffled;
}

/** Small deterministic PRNG so a given seed always produces the same shuffle. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Seeded Fisher-Yates shuffle that guarantees a different order (deterministic per seed). */
export function scrambleCareerSeeded(career: CareerEntry[], seed: number): CareerEntry[] {
  if (career.length <= 1) return [...career];

  let attempt = 0;
  while (true) {
    const rand = mulberry32(seed + attempt);
    const shuffled = [...career];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const isSameOrder = shuffled.every((entry, idx) => entry.club === career[idx].club);
    if (!isSameOrder) return shuffled;
    attempt++;
  }
}

/** Normalize a player name for comparison (strips diacritics) */
export function normalizeGuess(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

/** Check if a guess matches a player name */
export function isCorrectGuess(
  guess: string,
  targetName: string,
  targetNormalized: string,
): boolean {
  const normalizedGuess = normalizeGuess(guess);
  return normalizedGuess === targetNormalized || normalizedGuess === normalizeGuess(targetName);
}

// ---------------------------------------------------------------------------
// Proximity chips — "one-away" feedback after a wrong guess.
// ---------------------------------------------------------------------------
// Every miss should teach: we compare the GUESSED player to the ANSWER on four
// axes (nationality, position, league, era-overlap) and surface a row of chips.
// Green = shared with the answer, muted = differs (or unknown). Unknown collapses
// to a miss so the chip never falsely claims a match.

export interface ProximityChips {
  /** The player the user guessed (echoed for the chip header). */
  guessName: string;
  nationality: boolean;
  position: boolean;
  league: boolean;
  /** Careers overlapped by >= 3 years. */
  era: boolean;
}

interface ResolvedAttrs {
  nationality?: string;
  position?: string;
  league?: string;
  /** [earliest from, latest to] across the player's career, if known. */
  span?: [number, number];
}

let careerByNorm: Map<string, CareerPlayer> | null = null;
let dbByNorm: Map<string, Player> | null = null;

function norm(name: string): string {
  return normalizeGuess(name);
}

function careerLookup(): Map<string, CareerPlayer> {
  if (!careerByNorm) {
    careerByNorm = new Map();
    for (const p of getAllCareerPlayers()) {
      careerByNorm.set(p.normalized_name || norm(p.name), p);
    }
  }
  return careerByNorm;
}

function dbLookup(): Map<string, Player> {
  if (!dbByNorm) {
    dbByNorm = new Map();
    for (const p of getAllPlayers()) {
      const key = p.normalized_name || norm(p.name);
      if (!dbByNorm.has(key)) dbByNorm.set(key, p);
    }
  }
  return dbByNorm;
}

function careerSpan(career: CareerEntry[] | undefined): [number, number] | undefined {
  if (!career || career.length === 0) return undefined;
  let from = Infinity;
  let to = -Infinity;
  for (const e of career) {
    if (typeof e.from === 'number') from = Math.min(from, e.from);
    if (typeof e.to === 'number') to = Math.max(to, e.to);
  }
  return Number.isFinite(from) && Number.isFinite(to) ? [from, to] : undefined;
}

/** Resolve the comparable attributes of a player by name across both datasets. */
function resolveAttrs(name: string): ResolvedAttrs {
  const key = norm(name);
  const career = careerLookup().get(key);
  const db = dbLookup().get(key);
  return {
    nationality: career?.nationality || db?.nationality || undefined,
    position: career?.position || db?.position || undefined,
    league: db?.league || undefined,
    span: careerSpan(career?.career),
  };
}

function spansOverlapYears(a?: [number, number], b?: [number, number]): number {
  if (!a || !b) return 0;
  return Math.max(0, Math.min(a[1], b[1]) - Math.max(a[0], b[0]));
}

/**
 * Compare a guessed player to the answer. Returns null when the guess can't be
 * resolved at all (nothing to teach). A field is a match only when both sides
 * are known AND equal, so a chip never lies by matching two unknowns.
 */
export function computeProximity(guessName: string, answer: CareerPlayer): ProximityChips | null {
  const guess = resolveAttrs(guessName);
  const answerAttrs: ResolvedAttrs = {
    nationality: answer.nationality || dbLookup().get(norm(answer.name))?.nationality,
    position: answer.position || dbLookup().get(norm(answer.name))?.position,
    league: dbLookup().get(norm(answer.name))?.league,
    span: careerSpan(answer.career),
  };
  const same = (a?: string, b?: string) => !!a && !!b && norm(a) === norm(b);
  return {
    guessName,
    nationality: same(guess.nationality, answerAttrs.nationality),
    position: same(guess.position, answerAttrs.position),
    league: same(guess.league, answerAttrs.league),
    era: spansOverlapYears(guess.span, answerAttrs.span) >= 3,
  };
}

// ---------------------------------------------------------------------------
// Clue-economy rank — reward solving with fewer clues spent.
// ---------------------------------------------------------------------------
// Monotonic mapping onto the universal ladder (rankLadder): a solve on the first
// attempt with no hints unlocked is a perfect Ballon d'Or; each extra attempt and
// each unlocked hint spends "clue economy" and drops the tier. A loss is Kickoff.
//
//   score = 100 - attemptsUsed*18 - hintsUsed*8   (floored at 1 for any win)
//
// Worked examples (max 100 → ladder at 100/85/70/50/25/0 %):
//   1st try, 0 hints  = 100  → Ballon d'Or
//   1st try, 1 hint   =  92  → World Class
//   1st try, 2 hints  =  84  → Captain
//   2nd try, 0 hints  =  82  → Captain
//   2nd try, 2 hints  =  66  → First Team
//   3rd try, 1 hint   =  56  → First Team
const CLUE_RANK_MAX = 100;

/**
 * @param won          whether the player solved it
 * @param attemptsUsed guesses spent (0 = solved first try)
 * @param hintsUsed    number of hints unlocked
 */
export function careerClueRank(won: boolean, attemptsUsed: number, hintsUsed: number): Rank {
  if (!won) return getRank(0, CLUE_RANK_MAX);
  const score = Math.max(1, CLUE_RANK_MAX - attemptsUsed * 18 - hintsUsed * 8);
  return getRank(score, CLUE_RANK_MAX);
}
