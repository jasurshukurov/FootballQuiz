import { Player } from '@/types/player';
import { getAllPlayers, isActivePlayer, getFameForPlayer } from '@/lib/playerData';
import { colors } from '@/constants/theme';
import { shortenClubName } from '@/lib/clubNames';

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
  return TEAM_SHORT_NAMES[team] ?? shortenClubName(team);
}

function buildCategorySpecs(players: Player[]): CategorySpec[] {
  const specs: CategorySpec[] = [];

  // Group players by each attribute
  const byNationality = new Map<string, Player[]>();
  const byTeam = new Map<string, Player[]>();
  const byPosition = new Map<string, Player[]>();
  const byLeague = new Map<string, Player[]>();

  // Skip blank/null attribute values so we never build a "null players" or
  // " players" category from players with missing data.
  const add = (map: Map<string, Player[]>, val: string | undefined | null, p: Player) => {
    if (!val || String(val).trim() === '') return;
    if (!map.has(val)) map.set(val, []);
    map.get(val)!.push(p);
  };
  for (const p of players) {
    add(byNationality, p.nationality, p);
    add(byTeam, p.current_team, p);
    add(byPosition, p.position, p);
    add(byLeague, p.league, p);
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
    const fame = getFameForPlayer(p)?.fame_score;
    return fame !== undefined && fame >= 55 && isActivePlayer(p);
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

  // Ordered candidate specs: the type-diverse picks first, then every other
  // spec as fallback so name-collision rejections can't starve us below 4.
  const orderedSpecs: CategorySpec[] = [...chosenSpecs];
  for (const spec of shuffledSpecs) {
    if (!orderedSpecs.some((c) => c.value === spec.value && c.type === spec.type)) {
      orderedSpecs.push(spec);
    }
  }

  // Pick 4 players per category with:
  //  - UNIQUE ids AND unique display names across the whole board. Two different
  //    players sharing a name (e.g. two "André Silva"s) render as identical tiles
  //    and, since selection is a Set<string>, collapse and make a group unsolvable.
  //  - CROSS-CATEGORY EXCLUSIVITY: none of the 16 chosen players may satisfy any
  //    OTHER chosen category's criterion (e.g. a Slovenian goalkeeper fitting both
  //    "Goalkeepers" and "Slovenia players"), which would create multiple valid
  //    solutions. A spec is rejected deterministically if it can't be satisfied
  //    exclusively, and we continue to the next candidate spec.
  const matchesSpec = (p: Player, spec: CategorySpec): boolean => p[spec.type] === spec.value;

  const usedPlayerIds = new Set<number>();
  const usedNames = new Set<string>();
  const chosenPlayers: Player[] = [];
  const committedSpecs: CategorySpec[] = [];
  const categories: ConnectionsCategory[] = [];

  for (const spec of orderedSpecs) {
    if (categories.length >= 4) break;
    // Reject if an already-chosen player would also satisfy this new criterion.
    if (chosenPlayers.some((p) => matchesSpec(p, spec))) continue;

    const shuffled = seededShuffle(
      players.filter(
        (p) =>
          matchesSpec(p, spec) &&
          !usedPlayerIds.has(p.id) &&
          // must NOT also belong to any already-chosen category's criterion
          !committedSpecs.some((cs) => matchesSpec(p, cs)),
      ),
      rand,
    );
    const picked: Player[] = [];
    const pickedNames = new Set<string>();
    for (const p of shuffled) {
      if (usedNames.has(p.name) || pickedNames.has(p.name)) continue;
      picked.push(p);
      pickedNames.add(p.name);
      if (picked.length >= 4) break;
    }
    if (picked.length < 4) continue;

    for (const p of picked) {
      usedPlayerIds.add(p.id);
      usedNames.add(p.name);
      chosenPlayers.push(p);
    }
    committedSpecs.push(spec);
    categories.push({
      name: spec.label,
      color: CATEGORY_COLORS[0], // reassigned after fame-ordering below
      playerNames: picked.map((p) => p.name),
      difficulty: 0,
    });
  }

  // Order easy -> hard by mean member fame (higher fame = easier), mapping onto
  // the existing green/yellow/red/purple colour ladder.
  const meanFame = (c: ConnectionsCategory): number => {
    const scores = c.playerNames.map((n) => {
      const p = players.find((pl) => pl.name === n);
      return (p && getFameForPlayer(p)?.fame_score) ?? 0;
    });
    return scores.reduce((a, b) => a + b, 0) / (scores.length || 1);
  };
  categories.sort((a, b) => meanFame(b) - meanFame(a));
  categories.forEach((c, i) => {
    c.color = CATEGORY_COLORS[i] ?? CATEGORY_COLORS[0];
    c.difficulty = i;
  });

  const allNames = categories.flatMap((c) => c.playerNames);
  const shuffledNames = seededShuffle(allNames, rand);

  return { categories, shuffledNames };
}
