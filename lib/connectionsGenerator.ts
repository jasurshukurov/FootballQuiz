import { Player } from '@/types/player';
import { getAllPlayers } from '@/lib/playerData';
import { colors } from '@/constants/theme';

const fameScoresData = require('@/data/fame_scores.json') as {
  name: string;
  fame_score: number;
}[];

const fameByName: Map<string, number> = new Map();
for (const entry of fameScoresData) {
  const norm = entry.name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
  fameByName.set(norm, entry.fame_score);
}

export interface ConnectionsCategory {
  name: string;
  color: string;
  playerNames: string[];
  difficulty: number;
}

export interface ConnectionsPuzzle {
  categories: ConnectionsCategory[];
  shuffledNames: string[];
}

const CATEGORY_COLORS = [
  colors.matchGreen, // easy
  colors.cardYellow, // medium
  colors.offsideRed, // hard
  '#9B59B6', // expert
];

type CategoryType = 'nationality' | 'current_team' | 'position' | 'league';

interface CategorySpec {
  type: CategoryType;
  value: string;
  label: string;
}

const TEAM_SHORT_NAMES: Record<string, string> = {
  'Football Club Internazionale Milano S.p.A.': 'Inter Milan',
  'Associazione Sportiva Roma': 'AS Roma',
  'Società Sportiva Lazio S.p.A.': 'Lazio',
  'Atalanta Bergamasca Calcio S.p.a.': 'Atalanta',
  'Genoa Cricket and Football Club': 'Genoa',
  'Udinese Calcio': 'Udinese',
  'Torino Calcio': 'Torino',
  'Bologna Football Club 1909': 'Bologna',
  'Cagliari Calcio': 'Cagliari',
  'Parma Calcio 1913': 'Parma',
  'Eintracht Frankfurt Fußball AG': 'Eintracht Frankfurt',
  'Crystal Palace Football Club': 'Crystal Palace',
  'Real Betis Balompié S.A.D.': 'Real Betis',
  'Fußball-Club Augsburg 1907': 'FC Augsburg',
  'Getafe Club de Fútbol S. A. D. Team Dubai': 'Getafe',
  'Unione Sportiva Sassuolo Calcio': 'Sassuolo',
  'Verona Hellas Football Club': 'Hellas Verona',
};

function createSeededRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(arr: T[], rand: () => number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function getTeamLabel(team: string): string {
  return TEAM_SHORT_NAMES[team] ?? team;
}

function buildCategorySpecs(players: Player[]): CategorySpec[] {
  const specs: CategorySpec[] = [];

  // Group players by each attribute
  const byNationality = new Map<string, Player[]>();
  const byTeam = new Map<string, Player[]>();
  const byPosition = new Map<string, Player[]>();
  const byLeague = new Map<string, Player[]>();

  for (const p of players) {
    if (!byNationality.has(p.nationality)) byNationality.set(p.nationality, []);
    byNationality.get(p.nationality)!.push(p);

    if (!byTeam.has(p.current_team)) byTeam.set(p.current_team, []);
    byTeam.get(p.current_team)!.push(p);

    if (!byPosition.has(p.position)) byPosition.set(p.position, []);
    byPosition.get(p.position)!.push(p);

    if (!byLeague.has(p.league)) byLeague.set(p.league, []);
    byLeague.get(p.league)!.push(p);
  }

  // Only include groups that have at least 4 players
  for (const [val, group] of byNationality) {
    if (group.length >= 4) {
      specs.push({ type: 'nationality', value: val, label: `${val} players` });
    }
  }
  for (const [val, group] of byTeam) {
    if (group.length >= 4) {
      specs.push({ type: 'current_team', value: val, label: `${getTeamLabel(val)} players` });
    }
  }
  for (const [val, group] of byPosition) {
    if (group.length >= 4) {
      specs.push({ type: 'position', value: val, label: `${val}s` });
    }
  }
  for (const [val, group] of byLeague) {
    if (group.length >= 4) {
      specs.push({ type: 'league', value: val, label: `${val} players` });
    }
  }

  return specs;
}

export function generateConnectionsPuzzle(seed: number): ConnectionsPuzzle {
  const allPlayers = getAllPlayers().filter((p) => {
    const fame = fameByName.get(p.normalized_name);
    return fame !== undefined && fame >= 55 && (p.last_season ?? 0) >= 2024;
  });
  const players = allPlayers;
  const rand = createSeededRandom(seed);
  const allSpecs = buildCategorySpecs(players);

  // Shuffle specs so we get variety
  const shuffledSpecs = seededShuffle(allSpecs, rand);

  // We want 4 categories using different types for variety
  // Try to pick one of each type, falling back to duplicates if needed
  const typeOrder: CategoryType[] = seededShuffle(
    ['nationality', 'current_team', 'position', 'league'] as CategoryType[],
    rand,
  );

  const chosenSpecs: CategorySpec[] = [];
  const usedTypes = new Set<CategoryType>();

  // First pass: pick one spec per type
  for (const type of typeOrder) {
    const candidates = shuffledSpecs.filter(
      (s) => s.type === type && !chosenSpecs.some((c) => c.value === s.value),
    );
    if (candidates.length > 0) {
      chosenSpecs.push(candidates[0]);
      usedTypes.add(type);
    }
    if (chosenSpecs.length >= 4) break;
  }

  // Second pass: fill remaining from any type
  if (chosenSpecs.length < 4) {
    for (const spec of shuffledSpecs) {
      if (!chosenSpecs.some((c) => c.value === spec.value && c.type === spec.type)) {
        chosenSpecs.push(spec);
        if (chosenSpecs.length >= 4) break;
      }
    }
  }

  // Now pick 4 unique players per category, ensuring no overlaps
  const usedPlayerIds = new Set<number>();
  const categories: ConnectionsCategory[] = [];

  for (let i = 0; i < chosenSpecs.length; i++) {
    const spec = chosenSpecs[i];
    const eligible = players.filter((p) => p[spec.type] === spec.value && !usedPlayerIds.has(p.id));
    const picked = seededShuffle(eligible, rand).slice(0, 4);

    if (picked.length < 4) continue;

    for (const p of picked) usedPlayerIds.add(p.id);

    categories.push({
      name: spec.label,
      color: CATEGORY_COLORS[categories.length] ?? CATEGORY_COLORS[0],
      playerNames: picked.map((p) => p.name),
      difficulty: categories.length,
    });

    if (categories.length >= 4) break;
  }

  const allNames = categories.flatMap((c) => c.playerNames);
  const shuffledNames = seededShuffle(allNames, rand);

  return { categories, shuffledNames };
}
