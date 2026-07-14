import { FEATURES } from '@/lib/featureFlags';
import { getTodayDateString } from '@/lib/dailySeed';
import { dynamoCall, getGuestCredentials } from '@/lib/awsClient';
import { useIdentityStore } from '@/hooks/useIdentityStore';
import { useRemoteConfigStore } from '@/hooks/useRemoteConfigStore';

/**
 * Global leaderboard sync (DynamoDB via Cognito guest credentials).
 *
 * Score model:
 *  - All-time board: cumulative XP (useManagerStore.totalXp).
 *  - Daily board:    XP earned today = totalXp - identity day baseline
 *                    (maintained here from manager-store XP deltas).
 *
 * Item schema in FootballTriviaUserStats (PK userId / SK sortKey):
 *  - { userId: <cognitoIdentityId>, sortKey: 'LB#ALLTIME',      lbShard: 'ALLTIME',        lbScore: N, username, updatedAt }
 *  - { userId: <cognitoIdentityId>, sortKey: 'LB#DAILY#<date>', lbShard: 'DAILY#<date>',   lbScore: N, username, updatedAt }
 * The leaderboard-index GSI (hash lbShard, range lbScore) serves "top N by
 * score" queries; the IAM leading-key condition still restricts writes to the
 * caller's own identity id.
 *
 * HARD RULE: nothing here may ever throw to a caller or block the app.
 * Every network path is wrapped; failures resolve false/null and are retried
 * lazily (next XP change or next leaderboard screen mount).
 */

export const LEADERBOARD_TABLE = 'FootballTriviaUserStats';
export const LEADERBOARD_INDEX = 'leaderboard-index';
const ALLTIME_SHARD = 'ALLTIME';
const SYNC_DEBOUNCE_MS = 2500;
const MAX_USERNAME_LENGTH = 24;

export type LeaderboardBoard = 'daily' | 'alltime';

export interface LeaderboardEntry {
  userId: string;
  username: string;
  score: number;
}

// ---------------------------------------------------------------------------
// Gating
// ---------------------------------------------------------------------------

/**
 * Leaderboard on/off: local feature flag AND remote-config kill switch.
 * Missing field (stale cached config) counts as enabled; an explicit
 * `"leaderboardEnabled": false` in config.json turns everything off.
 */
export function isLeaderboardEnabled(): boolean {
  if (!FEATURES.leaderboard) return false;
  try {
    return useRemoteConfigStore.getState().config.leaderboardEnabled !== false;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Score derivation
// ---------------------------------------------------------------------------

// useManagerStore imports this module (syncManagerProfile), so a top-level
// import here would be circular. initLeaderboardSync loads it dynamically and
// caches the module for synchronous reads.
type ManagerStoreModule = typeof import('@/hooks/useManagerStore');
let managerStoreModule: ManagerStoreModule | null = null;

/** Local view of the two leaderboard scores. Never throws. */
export function getLocalScores(): { daily: number; alltime: number } {
  try {
    if (!managerStoreModule) return { daily: 0, alltime: 0 };
    const totalXp: number = managerStoreModule.useManagerStore.getState().totalXp ?? 0;
    const identity = useIdentityStore.getState();
    const daily =
      identity.xpDayDate === getTodayDateString()
        ? Math.max(0, totalXp - identity.xpDayStartTotal)
        : 0;
    return { daily, alltime: Math.max(0, totalXp) };
  } catch {
    return { daily: 0, alltime: 0 };
  }
}

// ---------------------------------------------------------------------------
// Item mapping (pure, unit-tested)
// ---------------------------------------------------------------------------

type DynamoAttribute = { S: string } | { N: string };
export type DynamoItem = Record<string, DynamoAttribute>;

export function sanitizeUsername(username: string): string {
  const cleaned = username.replace(/[^A-Za-z0-9]/g, '').slice(0, MAX_USERNAME_LENGTH);
  return cleaned.length > 0 ? cleaned : 'Player';
}

export function dailyShard(date: string): string {
  return `DAILY#${date}`;
}

export interface LeaderboardItemInput {
  identityId: string;
  username: string;
  date: string;
  dailyXp: number;
  totalXp: number;
  updatedAt: string;
}

/**
 * The PutItem payloads for one sync: the all-time item plus the daily item,
 * each only once there is any XP to report. Zero-score rows would just
 * clutter the shared board with fresh installs that opened the screen.
 */
export function buildLeaderboardItems(input: LeaderboardItemInput): DynamoItem[] {
  const username = sanitizeUsername(input.username);
  const base = {
    userId: { S: input.identityId },
    username: { S: username },
    updatedAt: { S: input.updatedAt },
  } as const;
  const items: DynamoItem[] = [];
  if (input.totalXp > 0) {
    items.push({
      ...base,
      sortKey: { S: 'LB#ALLTIME' },
      lbShard: { S: ALLTIME_SHARD },
      lbScore: { N: String(Math.floor(input.totalXp)) },
    });
  }
  if (input.dailyXp > 0) {
    items.push({
      ...base,
      sortKey: { S: `LB#DAILY#${input.date}` },
      lbShard: { S: dailyShard(input.date) },
      lbScore: { N: String(Math.floor(input.dailyXp)) },
    });
  }
  return items;
}

// ---------------------------------------------------------------------------
// Submit (debounced, deduped, offline-safe)
// ---------------------------------------------------------------------------

let lastSubmittedKey: string | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let inflightSubmit: Promise<boolean> | null = null;

function currentSubmitKey(): string {
  const { daily, alltime } = getLocalScores();
  const { username } = useIdentityStore.getState();
  return `${getTodayDateString()}|${username}|${daily}|${alltime}`;
}

/**
 * Upsert the user's leaderboard rows. Resolves true on success, false on any
 * failure (offline, flag off, throttled). Never throws.
 */
export async function submitLeaderboardScores(): Promise<boolean> {
  if (!isLeaderboardEnabled()) return false;
  if (inflightSubmit) return inflightSubmit;
  inflightSubmit = (async () => {
    try {
      const key = currentSubmitKey();
      const { username } = useIdentityStore.getState();
      const { daily, alltime } = getLocalScores();
      if (alltime <= 0 && daily <= 0) {
        // Nothing to report yet; don't create zero rows or fetch credentials.
        lastSubmittedKey = key;
        return true;
      }
      const credentials = await getGuestCredentials();
      const items = buildLeaderboardItems({
        identityId: credentials.identityId,
        username,
        date: getTodayDateString(),
        dailyXp: daily,
        totalXp: alltime,
        updatedAt: new Date().toISOString(),
      });
      for (const item of items) {
        await dynamoCall('PutItem', { TableName: LEADERBOARD_TABLE, Item: item });
      }
      lastSubmittedKey = key;
      return true;
    } catch {
      return false;
    } finally {
      inflightSubmit = null;
    }
  })();
  return inflightSubmit;
}

/** Debounced submit; called on every XP change and username shuffle. */
export function queueLeaderboardSync(): void {
  if (!isLeaderboardEnabled()) return;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void submitLeaderboardScores();
  }, SYNC_DEBOUNCE_MS);
}

/**
 * Light retry hook for UI mounts: submits only if the local scores or name
 * changed since the last successful submit. Never throws.
 */
export async function ensureLeaderboardSubmitted(): Promise<void> {
  try {
    if (!isLeaderboardEnabled()) return;
    if (lastSubmittedKey === currentSubmitKey()) return;
    await submitLeaderboardScores();
  } catch {
    // swallow: leaderboard is strictly best-effort
  }
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

function parseEntries(items: DynamoItem[] | undefined): LeaderboardEntry[] {
  if (!Array.isArray(items)) return [];
  const entries: LeaderboardEntry[] = [];
  for (const item of items) {
    const userId = (item.userId as { S?: string })?.S;
    const username = (item.username as { S?: string })?.S;
    const scoreRaw = (item.lbScore as { N?: string })?.N;
    const score = scoreRaw !== undefined ? Number(scoreRaw) : NaN;
    if (userId && Number.isFinite(score)) {
      entries.push({ userId, username: username || 'Player', score });
    }
  }
  return entries;
}

function shardFor(board: LeaderboardBoard): string {
  return board === 'daily' ? dailyShard(getTodayDateString()) : ALLTIME_SHARD;
}

/**
 * Top entries for a board, highest score first. Throws on network failure so
 * the UI can show its "couldn't load" state (callers catch).
 */
export async function fetchLeaderboard(
  board: LeaderboardBoard,
  limit = 50,
): Promise<LeaderboardEntry[]> {
  const result = await dynamoCall<{ Items?: DynamoItem[] }>('Query', {
    TableName: LEADERBOARD_TABLE,
    IndexName: LEADERBOARD_INDEX,
    KeyConditionExpression: 'lbShard = :shard',
    ExpressionAttributeValues: { ':shard': { S: shardFor(board) } },
    ScanIndexForward: false,
    Limit: limit,
  });
  return parseEntries(result.Items);
}

/**
 * 1-based rank on a board for the given score (count of strictly better
 * scores + 1). Returns null when it cannot be determined.
 */
export async function fetchMyRank(
  board: LeaderboardBoard,
  myScore: number,
): Promise<number | null> {
  try {
    const result = await dynamoCall<{ Count?: number }>('Query', {
      TableName: LEADERBOARD_TABLE,
      IndexName: LEADERBOARD_INDEX,
      KeyConditionExpression: 'lbShard = :shard AND lbScore > :mine',
      ExpressionAttributeValues: {
        ':shard': { S: shardFor(board) },
        ':mine': { N: String(Math.max(0, Math.floor(myScore))) },
      },
      Select: 'COUNT',
    });
    return typeof result.Count === 'number' ? result.Count + 1 : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Legacy manager-profile sync (kept for useManagerStore.syncToCloud)
// ---------------------------------------------------------------------------

interface ManagerStateForSync {
  totalXp: number;
  xpByMode: Record<string, number>;
  gamesCompletedByMode: Record<string, number>;
  lastSyncedAt: string | null;
}

export async function syncManagerProfile(state: ManagerStateForSync): Promise<void> {
  if (!isLeaderboardEnabled()) return;
  try {
    const credentials = await getGuestCredentials();
    await dynamoCall('PutItem', {
      TableName: LEADERBOARD_TABLE,
      Item: {
        userId: { S: credentials.identityId },
        sortKey: { S: 'PROFILE' },
        totalXp: { N: String(Math.max(0, Math.floor(state.totalXp))) },
        profileJson: {
          S: JSON.stringify({
            xpByMode: state.xpByMode,
            gamesCompletedByMode: state.gamesCompletedByMode,
          }),
        },
        updatedAt: { S: new Date().toISOString() },
      },
    });
  } catch {
    // best-effort only
  }
}

export async function fetchManagerProfile(): Promise<ManagerStateForSync | null> {
  if (!isLeaderboardEnabled()) return null;
  try {
    const credentials = await getGuestCredentials();
    const result = await dynamoCall<{ Item?: DynamoItem }>('GetItem', {
      TableName: LEADERBOARD_TABLE,
      Key: { userId: { S: credentials.identityId }, sortKey: { S: 'PROFILE' } },
    });
    if (!result.Item) return null;
    const totalXp = Number((result.Item.totalXp as { N?: string })?.N ?? '0');
    const parsed = JSON.parse((result.Item.profileJson as { S?: string })?.S ?? '{}');
    return {
      totalXp: Number.isFinite(totalXp) ? totalXp : 0,
      xpByMode: parsed.xpByMode ?? {},
      gamesCompletedByMode: parsed.gamesCompletedByMode ?? {},
      lastSyncedAt: (result.Item.updatedAt as { S?: string })?.S ?? null,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Automatic wiring: watch XP changes, maintain the day baseline, queue syncs.
// ---------------------------------------------------------------------------

let wired = false;

/**
 * Subscribes to the manager store (XP) and identity store (username).
 * Exported for tests; auto-runs once in the app via the deferred call below.
 * useManagerStore is imported dynamically to break the module cycle
 * (useManagerStore -> dynamoSync -> useManagerStore).
 */
export function initLeaderboardSync(): void {
  if (wired) return;
  wired = true;
  void import('@/hooks/useManagerStore')
    .then((mod) => {
      managerStoreModule = mod;
      const { useManagerStore } = mod;
      useManagerStore.subscribe((state: { totalXp: number }, prev: { totalXp: number }) => {
        try {
          if (state.totalXp === prev.totalXp) return;
          const today = getTodayDateString();
          const identity = useIdentityStore.getState();
          if (!useManagerStore.persist.hasHydrated()) {
            // Rehydration jump (0 -> persisted total), not real XP. Only make
            // sure the baseline points at today when the stored one is stale.
            if (identity.xpDayDate !== today) identity.setDayBaseline(today, state.totalXp);
            return;
          }
          if (state.totalXp < prev.totalXp) return;
          // First XP of a new local day: baseline = total before this award.
          if (identity.xpDayDate !== today) identity.setDayBaseline(today, prev.totalXp);
          queueLeaderboardSync();
        } catch {
          // never let sync bookkeeping break gameplay state updates
        }
      });
      // Username shuffles should propagate to the board.
      useIdentityStore.subscribe((state, prev) => {
        if (state.username !== prev.username) queueLeaderboardSync();
      });
    })
    .catch(() => {});
}

// Auto-wire in the app (useManagerStore imports this module, so this runs as
// soon as any game/stat surface loads). Deferred a tick to let the module
// cycle finish evaluating; skipped under jest so tests wire explicitly.
const globalProcess = (globalThis as { process?: { env?: Record<string, string | undefined> } })
  .process;
const isTestEnv = !!globalProcess?.env?.JEST_WORKER_ID;
if (!isTestEnv && typeof setTimeout === 'function') {
  setTimeout(() => initLeaderboardSync(), 0);
}
