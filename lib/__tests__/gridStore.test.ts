// The store persists via AsyncStorage; the web build touches `window`, absent
// in the node test env — swap in a self-contained in-memory implementation.
jest.mock('@react-native-async-storage/async-storage', () => {
  const store: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: (k: string) => Promise.resolve(store[k] ?? null),
      setItem: (k: string, v: string) => {
        store[k] = v;
        return Promise.resolve();
      },
      removeItem: (k: string) => {
        delete store[k];
        return Promise.resolve();
      },
    },
  };
});

// eslint-disable-next-line import/first -- ts-jest doesn't hoist jest.mock, so the mock must precede this import.
import { useGridGameStore, GridPlacement } from '@/hooks/useGridGameStore';

const reset = () =>
  useGridGameStore.setState({
    date: '',
    gridId: null,
    tier: null,
    placements: {},
    usedPlayerIds: [],
    wrongByCell: {},
    guessesUsed: 0,
    points: 0,
    hintsUsed: 0,
  });

const placement = (id: number): GridPlacement => ({
  playerId: id,
  playerName: `Player ${id}`,
  deepCut: false,
});

describe('useGridGameStore — guess economy', () => {
  beforeEach(reset);

  it('a correct pick fills a square, spends a guess and uses the player globally', () => {
    useGridGameStore.getState().recordCorrect('0-0', placement(10), 15);
    const s = useGridGameStore.getState();
    expect(s.placements['0-0'].playerId).toBe(10);
    expect(s.usedPlayerIds).toEqual([10]);
    expect(s.guessesUsed).toBe(1);
    expect(s.points).toBe(15);
    // A correct pick is not tracked as a wrong guess anywhere.
    expect(s.wrongByCell).toEqual({});
  });

  it('a wrong pick spends a guess, leaves the square open and is NOT globally used', () => {
    useGridGameStore.getState().recordWrong('1-1', 20);
    const s = useGridGameStore.getState();
    expect(s.placements['1-1']).toBeUndefined(); // square stays open
    expect(s.guessesUsed).toBe(1);
    expect(s.wrongByCell['1-1']).toEqual([20]);
    // Not globally banned — the player may still answer a different square.
    expect(s.usedPlayerIds).toEqual([]);
  });

  it('the same wrong player on the same cell is a no-op (no guess wasted)', () => {
    useGridGameStore.getState().recordWrong('1-1', 20);
    useGridGameStore.getState().recordWrong('1-1', 20);
    const s = useGridGameStore.getState();
    expect(s.wrongByCell['1-1']).toEqual([20]);
    expect(s.guessesUsed).toBe(1); // second attempt rejected, guess not spent
  });

  it('the same player may be tried on a different cell (spends a guess there)', () => {
    useGridGameStore.getState().recordWrong('0-0', 20);
    useGridGameStore.getState().recordWrong('0-1', 20);
    const s = useGridGameStore.getState();
    expect(s.wrongByCell['0-0']).toEqual([20]);
    expect(s.wrongByCell['0-1']).toEqual([20]);
    expect(s.guessesUsed).toBe(2);
  });

  it('bindDaily on a new grid clears wrong guesses and placements', () => {
    useGridGameStore.getState().recordWrong('0-0', 20);
    useGridGameStore.getState().recordCorrect('0-1', placement(11), 10);
    useGridGameStore.getState().bindDaily('2026-07-14', 'grid-xyz', 0);
    const s = useGridGameStore.getState();
    expect(s.wrongByCell).toEqual({});
    expect(s.placements).toEqual({});
    expect(s.usedPlayerIds).toEqual([]);
    expect(s.guessesUsed).toBe(0);
  });
});
