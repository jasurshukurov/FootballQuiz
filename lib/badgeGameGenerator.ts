import { teamColors } from '@/data/teamColors';

export interface BadgeRound {
  correctTeam: string;
  options: string[];
  seed: number;
}

// Filter to canonical team names only (no duplicates/aliases)
const canonicalTeams = Object.keys(teamColors).filter((name) => {
  const aliases: Record<string, boolean> = {
    'Brighton & Hove Albion': true,
    'Wolverhampton Wanderers': true,
    'AFC Bournemouth': true,
    'FC Barcelona': true,
    'Atletico de Madrid': true,
    'Villarreal CF': true,
    'Athletic Club': true,
    'Sevilla FC': true,
    'Valencia CF': true,
    'FC Bayern Munich': true,
    'Bayer 04 Leverkusen': true,
    'Inter Milan': true,
    'AC Milan': true,
    'SSC Napoli': true,
    'AS Roma': true,
    'SS Lazio': true,
    'ACF Fiorentina': true,
    PSG: true,
    'Olympique Marseille': true,
    'Olympique Lyon': true,
    'Olympique Lyonnais': true,
    'AS Monaco': true,
    'LOSC Lille': true,
  };
  return !aliases[name];
});

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function shuffleArray<T>(arr: T[], random: () => number): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function generateBadgeRound(seed: number, round: number): BadgeRound {
  const random = seededRandom(seed + round * 7919);

  const shuffled = shuffleArray(canonicalTeams, random);
  const correctTeam = shuffled[0];

  const wrongTeams = shuffled.slice(1, 4);
  const options = shuffleArray([correctTeam, ...wrongTeams], random);

  return { correctTeam, options, seed };
}

export function generateDailyBadgeGame(dateString: string): BadgeRound[] {
  let hash = 0;
  for (let i = 0; i < dateString.length; i++) {
    hash = (hash * 31 + dateString.charCodeAt(i)) & 0x7fffffff;
  }

  return Array.from({ length: 5 }, (_, i) => generateBadgeRound(hash, i));
}
