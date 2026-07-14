// NOTE: lives under lib/__tests__ because jest.config.js restricts discovery to
// `roots: ['<rootDir>/lib']`; it exercises hooks/useDailyStateStore via '@/'.
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
  },
}));

// eslint-disable-next-line import/first -- the AsyncStorage mock must be registered before this import.
import { useDailyStateStore } from '@/hooks/useDailyStateStore';
// eslint-disable-next-line import/first
import { getTodayDateString, getYesterdayDateString } from '@/lib/dailySeed';

function reset(overrides: Partial<ReturnType<typeof useDailyStateStore.getState>> = {}) {
  useDailyStateStore.setState({
    lastPlayedDate: null,
    lastCompletedDate: null,
    currentStreak: 0,
    maxStreak: 0,
    streakFrozenAvailable: false,
    previousStreak: 0,
    newBestDate: null,
    ...overrides,
  });
}

describe('keepStreak — newBestDate (new all-time best detection)', () => {
  it('does not celebrate day 1 as a record', () => {
    reset();
    useDailyStateStore.getState().keepStreak();
    const s = useDailyStateStore.getState();
    expect(s.currentStreak).toBe(1);
    expect(s.maxStreak).toBe(1);
    expect(s.newBestDate).toBeNull();
  });

  it('stamps today when the streak beats the previous best', () => {
    reset({
      lastCompletedDate: getYesterdayDateString(),
      currentStreak: 4,
      maxStreak: 4,
    });
    useDailyStateStore.getState().keepStreak();
    const s = useDailyStateStore.getState();
    expect(s.currentStreak).toBe(5);
    expect(s.maxStreak).toBe(5);
    expect(s.newBestDate).toBe(getTodayDateString());
  });

  it('does not stamp when merely continuing below the best', () => {
    reset({
      lastCompletedDate: getYesterdayDateString(),
      currentStreak: 2,
      maxStreak: 10,
    });
    useDailyStateStore.getState().keepStreak();
    const s = useDailyStateStore.getState();
    expect(s.currentStreak).toBe(3);
    expect(s.maxStreak).toBe(10);
    expect(s.newBestDate).toBeNull();
  });

  it('is idempotent per day (second completion never re-stamps)', () => {
    reset({
      lastCompletedDate: getYesterdayDateString(),
      currentStreak: 4,
      maxStreak: 4,
    });
    useDailyStateStore.getState().keepStreak();
    const stamped = useDailyStateStore.getState().newBestDate;
    useDailyStateStore.getState().keepStreak();
    expect(useDailyStateStore.getState().currentStreak).toBe(5);
    expect(useDailyStateStore.getState().newBestDate).toBe(stamped);
  });
});
