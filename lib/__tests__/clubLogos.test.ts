// clubLogos pulls in react-native (Platform) and AsyncStorage, neither of
// which parses under the node ts-jest environment — mock both (same pattern
// as dynamoSync.test.ts). Only the pure lookup logic is under test here.
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
  },
}));
jest.mock('react-native', () => ({ Platform: { OS: 'web' } }));

/* eslint-disable import/first -- mocks must be registered before the import. */
import { __lookupFileForTests as lookup } from '@/lib/clubLogos';

const manifest = {
  version: 1,
  base: '/club-logos/',
  clubs: {
    'Tottenham Hotspur': 'tottenham-hotspur.png',
    'Tottenham Hotspur Football Club': 'tottenham-hotspur.png',
    'Manchester United': 'manchester-united.png',
    'Newcastle United': 'newcastle-united.png',
    'AC Milan': 'ac-milan.png',
    Milan: 'ac-milan.png',
    Arsenal: 'arsenal.png',
  },
};

describe('club logo lookup', () => {
  it('resolves exact keys', () => {
    expect(lookup(manifest, 'Arsenal')).toBe('arsenal.png');
    expect(lookup(manifest, 'AC Milan')).toBe('ac-milan.png');
  });

  it('resolves short display labels when all candidates agree on one file', () => {
    expect(lookup(manifest, 'Tottenham')).toBe('tottenham-hotspur.png');
  });

  it('normalizes punctuation and case', () => {
    expect(lookup(manifest, 'tottenham  hotspur')).toBe('tottenham-hotspur.png');
  });

  it('refuses ambiguous matches rather than guess a crest', () => {
    // "United" is contained in two different clubs' keys.
    expect(lookup(manifest, 'United')).toBeNull();
  });

  it('refuses very short queries', () => {
    expect(lookup(manifest, 'AC')).toBeNull();
  });

  it('returns null for unknown clubs', () => {
    expect(lookup(manifest, 'Wanderers of Nowhere')).toBeNull();
  });
});
