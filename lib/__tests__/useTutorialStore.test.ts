// NOTE: lives under lib/__tests__ because jest.config.js restricts discovery to
// `roots: ['<rootDir>/lib']`; it exercises hooks/useTutorialStore via the '@/' mapper.
//
// The tutorial store is a zustand `persist` store backed by AsyncStorage, which has
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
import { useTutorialStore } from '@/hooks/useTutorialStore';

describe('useTutorialStore first-visit-once logic', () => {
  beforeEach(() => {
    // The store is a module singleton — reset to a pristine, un-hydrated state.
    useTutorialStore.setState({ seenTutorials: {}, hydrated: false });
  });

  it('does NOT auto-show before rehydration finishes (no flash for returning users)', () => {
    expect(useTutorialStore.getState().shouldAutoShow('grid')).toBe(false);
  });

  it('auto-shows exactly once: hydrated + unseen -> true, after markSeen -> false forever', () => {
    const s = () => useTutorialStore.getState();
    s().setHydrated();
    expect(s().shouldAutoShow('grid')).toBe(true);

    s().markSeen('grid');
    expect(s().shouldAutoShow('grid')).toBe(false);
    expect(s().hasSeen('grid')).toBe(true);

    // Second markSeen is idempotent.
    s().markSeen('grid');
    expect(s().shouldAutoShow('grid')).toBe(false);
  });

  it('tracks modes independently', () => {
    const s = () => useTutorialStore.getState();
    s().setHydrated();
    s().markSeen('grid');
    expect(s().shouldAutoShow('grid')).toBe(false);
    expect(s().shouldAutoShow('connections')).toBe(true);
    expect(s().hasSeen('connections')).toBe(false);
  });

  it('a persisted seen map survives as-is (markSeen merges, never clears)', () => {
    useTutorialStore.setState({ seenTutorials: { missing11: true }, hydrated: true });
    useTutorialStore.getState().markSeen('toplists');
    const seen = useTutorialStore.getState().seenTutorials;
    expect(seen.missing11).toBe(true);
    expect(seen.toplists).toBe(true);
  });
});
