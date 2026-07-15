// Leaderboard sync: item marshalling, feature gating and offline behavior.
// HARD REQUIREMENT under test: no network call may ever throw to a caller,
// and nothing is sent when the kill switch is off. No real network anywhere.
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
  },
}));

// The product flag is currently OFF (personal scores only). These tests cover
// the sync/kill-switch machinery itself, so they run with the flag forced on;
// the flag-off short-circuit has its own test below.
jest.mock('@/lib/featureFlags', () => ({
  FEATURES: { sharing: false, leaderboard: true },
}));

/* eslint-disable import/first -- the AsyncStorage mock must be registered before these imports. */
import {
  buildLeaderboardItems,
  dailyShard,
  ensureLeaderboardSubmitted,
  fetchMyRank,
  getLocalScores,
  initLeaderboardSync,
  isLeaderboardEnabled,
  queueLeaderboardSync,
  sanitizeUsername,
  submitLeaderboardScores,
} from '@/lib/dynamoSync';
import { resetAwsClientCacheForTests } from '@/lib/awsClient';
import { useIdentityStore } from '@/hooks/useIdentityStore';
import { useRemoteConfigStore } from '@/hooks/useRemoteConfigStore';
import { getDefaultConfig } from '@/lib/remoteConfig';
import { getTodayDateString } from '@/lib/dailySeed';
/* eslint-enable import/first */

const fetchMock = jest.fn<Promise<Response>, unknown[]>();

function setRemoteLeaderboard(enabled: boolean) {
  useRemoteConfigStore.getState().setConfig({ ...getDefaultConfig(), leaderboardEnabled: enabled });
}

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockRejectedValue(new Error('offline'));
  (globalThis as { fetch: unknown }).fetch = fetchMock;
  resetAwsClientCacheForTests();
  setRemoteLeaderboard(true);
});

describe('buildLeaderboardItems', () => {
  const base = {
    identityId: 'us-east-1:abc-123',
    username: 'SwiftVolley42',
    date: '2026-07-14',
    dailyXp: 120,
    totalXp: 950,
    updatedAt: '2026-07-14T10:00:00.000Z',
  };

  it('marshals the all-time and daily items around the table key schema', () => {
    const items = buildLeaderboardItems(base);
    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({
      userId: { S: 'us-east-1:abc-123' },
      sortKey: { S: 'LB#ALLTIME' },
      lbShard: { S: 'ALLTIME' },
      lbScore: { N: '950' },
      username: { S: 'SwiftVolley42' },
      updatedAt: { S: '2026-07-14T10:00:00.000Z' },
    });
    expect(items[1]).toEqual({
      userId: { S: 'us-east-1:abc-123' },
      sortKey: { S: 'LB#DAILY#2026-07-14' },
      lbShard: { S: 'DAILY#2026-07-14' },
      lbScore: { N: '120' },
      username: { S: 'SwiftVolley42' },
      updatedAt: { S: '2026-07-14T10:00:00.000Z' },
    });
  });

  it('skips the daily item when no XP was earned today', () => {
    const items = buildLeaderboardItems({ ...base, dailyXp: 0 });
    expect(items).toHaveLength(1);
    expect(items[0].sortKey).toEqual({ S: 'LB#ALLTIME' });
  });

  it('floors fractional scores and drops non-positive ones', () => {
    const items = buildLeaderboardItems({ ...base, dailyXp: 12.9, totalXp: -5 });
    expect(items).toHaveLength(1);
    expect(items[0].sortKey).toEqual({ S: 'LB#DAILY#2026-07-14' });
    expect(items[0].lbScore).toEqual({ N: '12' });
  });

  it('builds nothing for a fresh install (no zero rows on the shared board)', () => {
    expect(buildLeaderboardItems({ ...base, dailyXp: 0, totalXp: 0 })).toHaveLength(0);
  });

  it('sanitizes usernames for the shared board', () => {
    expect(sanitizeUsername('Swift Volley!42')).toBe('SwiftVolley42');
    expect(sanitizeUsername('<script>')).toBe('script');
    expect(sanitizeUsername('!!!')).toBe('Player');
    expect(sanitizeUsername('A'.repeat(50))).toHaveLength(24);
  });

  it('builds daily shards from the local date', () => {
    expect(dailyShard('2026-07-14')).toBe('DAILY#2026-07-14');
  });
});

describe('feature gating', () => {
  it('is disabled by the remote kill switch and enabled otherwise', () => {
    setRemoteLeaderboard(false);
    expect(isLeaderboardEnabled()).toBe(false);
    setRemoteLeaderboard(true);
    expect(isLeaderboardEnabled()).toBe(true);
  });

  it('treats a config missing the field (stale cache) as enabled', () => {
    const config = getDefaultConfig();
    delete config.leaderboardEnabled;
    useRemoteConfigStore.getState().setConfig(config);
    expect(isLeaderboardEnabled()).toBe(true);
  });

  it('makes no network calls and resolves false when the flag is off', async () => {
    setRemoteLeaderboard(false);
    await expect(submitLeaderboardScores()).resolves.toBe(false);
    await expect(ensureLeaderboardSubmitted()).resolves.toBeUndefined();
    queueLeaderboardSync();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

/** Wire the manager store (idempotent) and wait for the dynamic import +
 *  persist rehydration so XP mutations behave like real awards. */
async function wireManagerStore() {
  initLeaderboardSync();
  await new Promise((resolve) => setTimeout(resolve, 0));
  const { useManagerStore } = await import('@/hooks/useManagerStore');
  for (let i = 0; i < 20 && !useManagerStore.persist.hasHydrated(); i++) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  expect(useManagerStore.persist.hasHydrated()).toBe(true);
  return useManagerStore;
}

describe('offline safety (hard requirement: never throw, never block)', () => {
  it('submitLeaderboardScores resolves false when the network is down', async () => {
    // Give the user a nonzero score (mutate with the flag off so the store
    // subscription cannot queue a debounced background submit mid-test).
    setRemoteLeaderboard(false);
    const useManagerStore = await wireManagerStore();
    useManagerStore.setState({ totalXp: 100 });
    setRemoteLeaderboard(true);

    await expect(submitLeaderboardScores()).resolves.toBe(false);
    expect(fetchMock).toHaveBeenCalled();
  });

  it('ensureLeaderboardSubmitted swallows network failures', async () => {
    await expect(ensureLeaderboardSubmitted()).resolves.toBeUndefined();
  });

  it('fetchMyRank resolves null instead of throwing', async () => {
    await expect(fetchMyRank('alltime', 100)).resolves.toBeNull();
  });
});

describe('daily XP baseline wiring', () => {
  it('derives daily XP from manager-store deltas after initLeaderboardSync', async () => {
    // Avoid debounced network traffic from the sync queue in this test.
    setRemoteLeaderboard(false);

    const useManagerStore = await wireManagerStore();
    useManagerStore.setState({ totalXp: 0, xpByMode: {}, gamesCompletedByMode: {} });
    useIdentityStore.setState({ xpDayDate: null, xpDayStartTotal: 0 });

    useManagerStore.getState().addXp('grid', 50);
    expect(useIdentityStore.getState().xpDayDate).toBe(getTodayDateString());
    expect(getLocalScores()).toEqual({ daily: 50, alltime: 50 });

    useManagerStore.getState().addXp('connections', 70);
    expect(getLocalScores()).toEqual({ daily: 120, alltime: 120 });

    // A stale baseline from a previous day yields daily 0 until new XP lands.
    useIdentityStore.setState({ xpDayDate: '2020-01-01', xpDayStartTotal: 0 });
    expect(getLocalScores()).toEqual({ daily: 0, alltime: 120 });
  });
});
