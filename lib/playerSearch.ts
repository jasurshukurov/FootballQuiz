// Unified fame-blended player search — THE ranking engine behind every player
// autocomplete (Career Path, Who Are Ya, Missing XI, Top Lists).
//
// Ranking contract: ACCURACY FIRST, FAME AS THE GRADED TIEBREAK. Results are
// bucketed by textual match quality (exact full name > name/last-name prefix >
// word prefix > substring > fuzzy) and fame only orders players INSIDE a
// bucket. Fame can therefore never promote a fuzzy match above a strictly
// better textual match, and an exact full-name match always ranks #1 even for
// an obscure player.
//
// Fame joins by players_db id (disambiguated fame_by_id) with a name fallback
// for synthetic entries (historic lineup legends, career-path retirees) that
// carry ids outside players_db.

import Fuse from 'fuse.js';

import { Player } from '@/types/player';
import { getAllPlayers, getFameById, getFameByName } from '@/lib/playerData';

/**
 * Fold a string for matching: lowercase, diacritics stripped (Özil -> ozil,
 * Mbappé -> mbappe), punctuation collapsed to single spaces (Heung-min ->
 * heung min).
 */
export function foldSearchText(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Match-quality buckets, best (lowest) first.
const MATCH = {
  EXACT: 0, // query === full name
  PREFIX: 1, // query is a prefix of the full name or of the last name
  WORD_PREFIX: 2, // query is a prefix of any name token (or token run)
  SUBSTRING: 3, // query appears anywhere in the name
  FUZZY: 4, // fuse.js typo-tolerant match only
} as const;

interface Entry {
  player: Player;
  full: string;
  tokens: string[];
  last: string;
  fame: number;
}

function fameOf(p: Player): number {
  return getFameById(p.id)?.fame_score ?? getFameByName(p.name)?.fame_score ?? 0;
}

/**
 * True when every query token matches a consecutive run of name tokens —
 * earlier tokens exactly, the final one as a prefix ("de bru" hits
 * "kevin de bruyne").
 */
function tokenRunPrefix(tokens: string[], qTokens: string[]): boolean {
  outer: for (let s = 0; s + qTokens.length <= tokens.length; s++) {
    for (let i = 0; i < qTokens.length; i++) {
      const isLast = i === qTokens.length - 1;
      if (isLast ? !tokens[s + i].startsWith(qTokens[i]) : tokens[s + i] !== qTokens[i]) {
        continue outer;
      }
    }
    return true;
  }
  return false;
}

/** The textual (non-fuzzy) bucket for an entry, or null if it doesn't match. */
function textualBucket(e: Entry, q: string, qTokens: string[]): number | null {
  if (e.full === q) return MATCH.EXACT;
  if (e.full.startsWith(q) || e.last.startsWith(q)) return MATCH.PREFIX;
  const wordHit =
    qTokens.length === 1
      ? e.tokens.some((t) => t.startsWith(q))
      : tokenRunPrefix(e.tokens, qTokens);
  if (wordHit) return MATCH.WORD_PREFIX;
  if (q.length >= 3 && e.full.includes(q)) return MATCH.SUBSTRING;
  return null;
}

export interface PlayerSearchOptions {
  limit?: number;
  /** Game-specific eligibility (e.g. exclude already-guessed players). */
  filter?: (p: Player) => boolean;
}

export interface PlayerSearchEngine {
  search(query: string, opts?: PlayerSearchOptions): Player[];
}

const DEFAULT_LIMIT = 20;

// Fuse scores inside the fuzzy bucket are quantized into bands so that fame
// breaks ties between "equally fuzzy" candidates without letting a slightly
// worse match with a huge fame score jump a clearly better one.
const FUZZY_BAND = 0.15;

/**
 * Build a search engine over an arbitrary player pool (Missing XI's guess pool,
 * Career Path's DB+retirees, ...). Precomputes folded names and fame once.
 */
export function createPlayerSearchEngine(players: Player[]): PlayerSearchEngine {
  const entries: Entry[] = players.map((player) => {
    const full = foldSearchText(player.name);
    const tokens = full.length > 0 ? full.split(' ') : [];
    return {
      player,
      full,
      tokens,
      last: tokens.length > 0 ? tokens[tokens.length - 1] : '',
      fame: fameOf(player),
    };
  });

  // Fuse index is built lazily: most keystrokes are satisfied by the cheap
  // textual pass and never pay for fuzzy matching.
  let fuse: Fuse<Entry> | null = null;
  const getFuse = () => {
    if (!fuse) {
      fuse = new Fuse(entries, {
        keys: ['full'],
        includeScore: true,
        threshold: 0.35,
        distance: 100,
        ignoreLocation: true,
        minMatchCharLength: 2,
      });
    }
    return fuse;
  };

  function search(query: string, opts: PlayerSearchOptions = {}): Player[] {
    const limit = opts.limit ?? DEFAULT_LIMIT;
    const q = foldSearchText(query);
    if (q.length === 0 || limit <= 0) return [];
    const qTokens = q.split(' ');

    type Scored = { e: Entry; bucket: number; band: number };
    const scored: Scored[] = [];
    const matched = new Set<number>();

    entries.forEach((e, i) => {
      if (opts.filter && !opts.filter(e.player)) return;
      const bucket = textualBucket(e, q, qTokens);
      if (bucket !== null) {
        scored.push({ e, bucket, band: 0 });
        matched.add(i);
      }
    });

    // Fuzzy fill only when textual matches can't fill the list — a fuzzy hit
    // can never outrank a textual one (strictly worse bucket).
    if (scored.length < limit && q.length >= 2) {
      for (const r of getFuse().search(q, { limit: limit * 3 })) {
        const i = r.refIndex;
        if (matched.has(i)) continue;
        const e = entries[i];
        if (opts.filter && !opts.filter(e.player)) continue;
        scored.push({ e, bucket: MATCH.FUZZY, band: Math.round((r.score ?? 1) / FUZZY_BAND) });
      }
    }

    scored.sort(
      (a, b) =>
        a.bucket - b.bucket ||
        a.band - b.band ||
        b.e.fame - a.e.fame ||
        (b.e.player.market_value || 0) - (a.e.player.market_value || 0) ||
        a.e.full.localeCompare(b.e.full),
    );

    return scored.slice(0, limit).map((s) => s.e.player);
  }

  return { search };
}

let defaultEngine: PlayerSearchEngine | null = null;

/** Fame-blended search over the full players_db. */
export function searchPlayers(query: string, opts?: PlayerSearchOptions): Player[] {
  if (!defaultEngine) defaultEngine = createPlayerSearchEngine(getAllPlayers());
  return defaultEngine.search(query, opts);
}
