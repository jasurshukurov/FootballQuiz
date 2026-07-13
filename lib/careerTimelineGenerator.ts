import { CareerEntry } from '@/types/career';
import { getAllCareerPlayers } from './careerData';
import { rotatingPick, ROTATION_SALT } from './dailyRotation';

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
): CareerTimelinePuzzle {
  const rng = seededRandom(seed);
  const allPlayers = getAllCareerPlayers();
  // Only pick well-known players (beginner/amateur/semi_pro tiers = most famous)
  const FAMOUS_TIERS = new Set(['beginner', 'amateur', 'semi_pro']);
  const eligible = allPlayers.filter((p) => p.career.length >= 3 && FAMOUS_TIERS.has(p.tier));

  const player =
    dayIndex === undefined
      ? eligible[Math.floor(rng() * eligible.length)]
      : rotatingPick(eligible, dayIndex, ROTATION_SALT.careerTimeline);

  const nodes: TimelineNode[] = player.career.map((entry: CareerEntry, i: number) => {
    const isFirst = i === 0;
    const isLast = i === player.career.length - 1;
    // Always reveal first and last
    if (isFirst || isLast) {
      return {
        club: entry.club,
        from: entry.from,
        to: entry.to,
        isHidden: false,
        isGuessed: false,
        hintRevealed: false,
      };
    }
    // ~50% chance to hide middle clubs
    return {
      club: entry.club,
      from: entry.from,
      to: entry.to,
      isHidden: rng() < 0.5,
      isGuessed: false,
      hintRevealed: false,
    };
  });

  // Hide at least 2 middle clubs when the career is long enough (>=4 stints);
  // for a 3-stint career only the single middle node can be hidden.
  const middleIndices: number[] = [];
  for (let i = 1; i < nodes.length - 1; i++) middleIndices.push(i);
  const desiredHidden = Math.min(2, middleIndices.length);
  const hiddenSet = new Set(middleIndices.filter((i) => nodes[i].isHidden));
  // Deterministically hide more middle nodes until we reach the desired count.
  const shuffledMiddles = [...middleIndices].sort(() => rng() - 0.5);
  for (const idx of shuffledMiddles) {
    if (hiddenSet.size >= desiredHidden) break;
    if (!hiddenSet.has(idx)) {
      nodes[idx].isHidden = true;
      hiddenSet.add(idx);
    }
  }

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

// Alias map for common club name abbreviations
const CLUB_ALIASES: Record<string, string[]> = {
  'paris saint-germain': ['psg'],
  'manchester united': ['man united', 'man utd'],
  'manchester city': ['man city'],
  'fc barcelona': ['barca', 'barcelona'],
  'real madrid': ['real'],
  'bayern munich': ['bayern', 'fc bayern munchen', 'fc bayern münchen'],
  juventus: ['juve'],
  'inter milan': ['inter', 'internazionale'],
  'atletico madrid': ['atletico', 'atletico de madrid', 'atlético de madrid'],
  'tottenham hotspur': ['spurs', 'tottenham'],
};

function normalize(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

// Build reverse alias map: alias -> canonical names
const reverseAliases = new Map<string, string[]>();
for (const [canonical, aliases] of Object.entries(CLUB_ALIASES)) {
  const normCanonical = normalize(canonical);
  // Map canonical to itself
  if (!reverseAliases.has(normCanonical)) {
    reverseAliases.set(normCanonical, []);
  }
  reverseAliases.get(normCanonical)!.push(normCanonical);
  // Map each alias to canonical
  for (const alias of aliases) {
    const normAlias = normalize(alias);
    if (!reverseAliases.has(normAlias)) {
      reverseAliases.set(normAlias, []);
    }
    reverseAliases.get(normAlias)!.push(normCanonical);
    // Also map canonical back from alias
    reverseAliases.get(normCanonical)!.push(normAlias);
  }
}

function getAliasGroup(name: string): string[] {
  const norm = normalize(name);
  // Check direct match
  if (reverseAliases.has(norm)) {
    return reverseAliases.get(norm)!;
  }
  // Check if name contains or is contained by any alias key
  for (const [key, group] of reverseAliases.entries()) {
    if (norm.includes(key) || key.includes(norm)) {
      return group;
    }
  }
  return [norm];
}

export function clubNamesMatch(guess: string, target: string): boolean {
  const normGuess = normalize(guess);
  const normTarget = normalize(target);

  // Direct match
  if (normGuess === normTarget) return true;

  // Check if either appears in the other (partial containment)
  if (normTarget.includes(normGuess) || normGuess.includes(normTarget)) return true;

  // Check alias groups
  const guessGroup = getAliasGroup(normGuess);
  const targetGroup = getAliasGroup(normTarget);

  for (const g of guessGroup) {
    for (const t of targetGroup) {
      if (g === t) return true;
    }
  }

  return false;
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
