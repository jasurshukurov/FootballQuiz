// NOTE: lives under lib/__tests__ because jest.config.js restricts discovery to
// `roots: ['<rootDir>/lib']`; it exercises hooks/useThemeStore via the '@/' mapper.
//
// The theme store is a zustand `persist` store backed by AsyncStorage, which has
// no implementation under the node test environment — mock it so the import is
// pure. (useTheme.ts itself imports react-native's useColorScheme and is NOT
// imported here; the resolution logic under test is the pure resolveTheme.)
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
  },
}));

// eslint-disable-next-line import/first -- the AsyncStorage mock must be registered before this import.
import {
  DEFAULT_SELECTION,
  migrateThemeStore,
  resolveTheme,
  useThemeStore,
} from '@/hooks/useThemeStore';

describe('theme selection default', () => {
  it('new installs default to the dark theme regardless of device scheme', () => {
    expect(DEFAULT_SELECTION).toBe('floodlit');
    expect(useThemeStore.getState().themeKey).toBe('floodlit');
  });

  it('setTheme records an explicit choice and can opt into system', () => {
    useThemeStore.getState().setTheme('vintage');
    expect(useThemeStore.getState().themeKey).toBe('vintage');
    useThemeStore.getState().setTheme('system');
    expect(useThemeStore.getState().themeKey).toBe('system');
  });
});

describe('resolveTheme — system selection follows the OS scheme', () => {
  it('dark scheme -> floodlit', () => {
    expect(resolveTheme('system', 'dark').key).toBe('floodlit');
  });

  it('light scheme -> daybreak', () => {
    expect(resolveTheme('system', 'light').key).toBe('daybreak');
  });

  it('unknown scheme (null/undefined) -> dark (floodlit)', () => {
    expect(resolveTheme('system', null).key).toBe('floodlit');
    expect(resolveTheme('system', undefined).key).toBe('floodlit');
  });
});

describe('resolveTheme — explicit selection ignores the OS scheme', () => {
  it('an explicit theme is returned regardless of scheme', () => {
    expect(resolveTheme('blackout', 'light').key).toBe('blackout');
    expect(resolveTheme('daybreak', 'dark').key).toBe('daybreak');
    expect(resolveTheme('vintage', 'dark').key).toBe('vintage');
  });

  it('a stale/unknown key falls back to the default theme', () => {
    expect(resolveTheme('nope' as never, 'dark').key).toBe('floodlit');
  });

  it('never resolves to the sentinel selection', () => {
    (['system', 'floodlit', 'blackout', 'daybreak', 'vintage'] as const).forEach((sel) => {
      expect(resolveTheme(sel, 'dark').key).not.toBe('system');
      expect(resolveTheme(sel, 'light').key).not.toBe('system');
    });
  });
});

describe('migrateThemeStore — v2 keeps explicit choices, retires system default', () => {
  it('carries an existing explicit theme forward unchanged (no reset)', () => {
    expect(migrateThemeStore({ themeKey: 'floodlit' })).toEqual({ themeKey: 'floodlit' });
    expect(migrateThemeStore({ themeKey: 'vintage' })).toEqual({ themeKey: 'vintage' });
    expect(migrateThemeStore({ themeKey: 'daybreak' })).toEqual({ themeKey: 'daybreak' });
  });

  it("a persisted 'system' (the old install default) migrates to the dark default", () => {
    expect(migrateThemeStore({ themeKey: 'system' })).toEqual({ themeKey: 'floodlit' });
  });

  it('missing/corrupt persisted state falls back to the dark default', () => {
    expect(migrateThemeStore(null)).toEqual({ themeKey: 'floodlit' });
    expect(migrateThemeStore(undefined)).toEqual({ themeKey: 'floodlit' });
    expect(migrateThemeStore({})).toEqual({ themeKey: 'floodlit' });
  });
});
