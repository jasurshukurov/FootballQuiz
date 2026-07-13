// Generator for "Top Lists" — a once-per-day Wordle-style mode where the player
// names the entries of a famous football ranking (e.g. World Cup top scorers).
//
// The day's list is chosen with the shared fixed-salt rotation (lib/dailyRotation)
// so it's deterministic per date and never repeats until the whole pool cycles.
// Free-text guesses are fuzzy-matched (fuse.js) against entry names + aliases.

import Fuse from 'fuse.js';

import { rotatingPick } from '@/lib/dailyRotation';
import { getDailyNumber } from '@/lib/dailyPuzzle';

const rawLists = require('@/data/top_lists.json') as unknown[];

/** Fixed per-mode salt (arbitrary constant — never change it). */
const TOPLISTS_SALT = 0x27d4eb2f;

export interface TopListEntry {
  rank: number;
  name: string;
  value: number;
  unit: string;
  aliases: string[];
}

export interface TopList {
  id: string;
  title: string;
  group: string;
  as_of?: string;
  entries: TopListEntry[];
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Validate/normalize a raw list. Returns null if it's not usable. Tolerant of
 *  any number of lists and missing optional fields so the researcher-merged file
 *  drops in transparently. */
function validateList(raw: unknown): TopList | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.id !== 'string' || typeof obj.title !== 'string') return null;
  if (!Array.isArray(obj.entries) || obj.entries.length === 0) return null;

  const entries: TopListEntry[] = [];
  for (const e of obj.entries) {
    if (!e || typeof e !== 'object') continue;
    const entry = e as Record<string, unknown>;
    if (typeof entry.name !== 'string' || typeof entry.value !== 'number') continue;
    entries.push({
      rank: typeof entry.rank === 'number' ? entry.rank : entries.length + 1,
      name: entry.name,
      value: entry.value,
      unit: typeof entry.unit === 'string' ? entry.unit : '',
      aliases: Array.isArray(entry.aliases)
        ? entry.aliases.filter((a) => typeof a === 'string')
        : [],
    });
  }
  if (entries.length === 0) return null;

  entries.sort((a, b) => a.rank - b.rank);
  return {
    id: obj.id,
    title: obj.title,
    group: typeof obj.group === 'string' ? obj.group : '',
    as_of: typeof obj.as_of === 'string' ? obj.as_of : undefined,
    entries,
  };
}

let cached: TopList[] | null = null;

/** All valid Top Lists (validated + rank-sorted). */
export function getAllTopLists(): TopList[] {
  if (!cached) cached = rawLists.map(validateList).filter((l): l is TopList => l !== null);
  return cached;
}

/** The Top List for a given date (defaults to today), via the shared rotation. */
export function getDailyTopList(dateStr?: string): TopList {
  const pool = getAllTopLists();
  const date = dateStr ? new Date(`${dateStr}T00:00:00`) : new Date();
  return rotatingPick(pool, getDailyNumber(date), TOPLISTS_SALT);
}

/** Every searchable term (name + aliases) tagged with its entry index. */
function termsFor(list: TopList): { index: number; term: string }[] {
  const terms: { index: number; term: string }[] = [];
  list.entries.forEach((entry, index) => {
    terms.push({ index, term: normalize(entry.name) });
    for (const alias of entry.aliases) terms.push({ index, term: normalize(alias) });
  });
  return terms;
}

/**
 * Fuzzy-match a free-text guess to an entry index, or null if nothing matches
 * confidently. Tight enough that "Klose" hits but a single letter / garbage
 * doesn't.
 */
export function matchGuess(list: TopList, guess: string): number | null {
  const g = normalize(guess);
  if (g.length < 3) return null;

  const terms = termsFor(list);

  // Exact / contained match first (fast, unambiguous).
  for (const t of terms) {
    if (t.term === g || t.term.split(' ').includes(g)) return t.index;
  }

  const fuse = new Fuse(terms, {
    keys: ['term'],
    threshold: 0.3,
    ignoreLocation: true,
    minMatchCharLength: 3,
    includeScore: true,
  });
  const results = fuse.search(g);
  if (results.length > 0 && (results[0].score ?? 1) <= 0.3) {
    return results[0].item.index;
  }
  return null;
}
