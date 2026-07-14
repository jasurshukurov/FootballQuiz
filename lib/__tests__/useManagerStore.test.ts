// NOTE: This lives under lib/__tests__ (not hooks/__tests__) because jest.config.js
// restricts test discovery to `roots: ['<rootDir>/lib']`; a file under hooks/ would
// never run. It still exercises hooks/useManagerStore via the '@/' path mapper.
//
// The manager store is a zustand `persist` store backed by AsyncStorage, which has
// no implementation under the node test environment — mock it so the import is pure.
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
  },
}));

// eslint-disable-next-line import/first -- the AsyncStorage mock must be registered before this import.
import { useManagerStore } from '@/hooks/useManagerStore';

describe('awardDailyXp', () => {
  beforeEach(() => {
    // Reset to a clean profile before each case (the store is a module singleton).
    useManagerStore.setState({
      totalXp: 0,
      xpByMode: {},
      gamesCompletedByMode: {},
      xpAwardedDate: {},
      lastSyncedAt: null,
    });
  });

  it('awards XP once for a mode and reports success', () => {
    const awarded = useManagerStore.getState().awardDailyXp('who-are-ya', 60);
    expect(awarded).toBe(true);
    expect(useManagerStore.getState().totalXp).toBe(60);
    expect(useManagerStore.getState().xpByMode['who-are-ya']).toBe(60);
    expect(useManagerStore.getState().gamesCompletedByMode['who-are-ya']).toBe(1);
  });

  it('returns false and awards nothing on a second same-day call (Play-Again guard)', () => {
    const store = useManagerStore.getState();
    expect(store.awardDailyXp('who-are-ya', 60)).toBe(true);

    const xpAfterFirst = useManagerStore.getState().totalXp;
    expect(store.awardDailyXp('who-are-ya', 60)).toBe(false);

    // No inflation: neither XP nor the games-completed counter moved.
    expect(useManagerStore.getState().totalXp).toBe(xpAfterFirst);
    expect(useManagerStore.getState().gamesCompletedByMode['who-are-ya']).toBe(1);
  });

  it('still awards a different mode on the same day', () => {
    const store = useManagerStore.getState();
    expect(store.awardDailyXp('who-are-ya', 60)).toBe(true);
    expect(store.awardDailyXp('higher-lower', 40)).toBe(true);

    expect(useManagerStore.getState().totalXp).toBe(100);
    expect(useManagerStore.getState().xpByMode['higher-lower']).toBe(40);
  });

  it('ignores a non-positive amount but still marks the day as awarded', () => {
    // addXp early-returns on amount <= 0, but the day is still claimed so a later
    // positive replay the same day cannot sneak XP in.
    const store = useManagerStore.getState();
    expect(store.awardDailyXp('badge', 0)).toBe(true);
    expect(useManagerStore.getState().totalXp).toBe(0);
    expect(store.awardDailyXp('badge', 50)).toBe(false);
    expect(useManagerStore.getState().totalXp).toBe(0);
  });
});
