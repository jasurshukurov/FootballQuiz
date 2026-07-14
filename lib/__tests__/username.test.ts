import {
  USERNAME_ADJECTIVES,
  USERNAME_NOUNS,
  generateUsername,
  generateUuid,
} from '@/lib/username';
import { createSeededRandom } from '@/lib/dailySeed';

describe('generateUsername', () => {
  it('produces Adjective+Noun+Number shapes', () => {
    for (let i = 0; i < 200; i++) {
      const name = generateUsername();
      expect(name).toMatch(/^[A-Z][A-Za-z]+[1-9][0-9]?$/);
      // Must decompose into a known adjective + known noun.
      const adjective = USERNAME_ADJECTIVES.find((a) => name.startsWith(a));
      expect(adjective).toBeDefined();
      const rest = name.slice(adjective!.length);
      const noun = USERNAME_NOUNS.find((n) => rest.startsWith(n));
      expect(noun).toBeDefined();
      const num = Number(rest.slice(noun!.length));
      expect(num).toBeGreaterThanOrEqual(1);
      expect(num).toBeLessThanOrEqual(99);
    }
  });

  it('is deterministic for a seeded rng', () => {
    const a = generateUsername(createSeededRandom(1234));
    const b = generateUsername(createSeededRandom(1234));
    const c = generateUsername(createSeededRandom(5678));
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it('produces reasonable variety', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 300; i++) seen.add(generateUsername());
    expect(seen.size).toBeGreaterThan(150);
  });

  it('stays within a sane display length', () => {
    let longest = 0;
    for (const a of USERNAME_ADJECTIVES) {
      for (const n of USERNAME_NOUNS) longest = Math.max(longest, a.length + n.length + 2);
    }
    expect(longest).toBeLessThanOrEqual(24);
  });
});

describe('username pools are IP-free', () => {
  // Substrings of real player / club / brand names that must never appear.
  const FORBIDDEN = [
    'messi',
    'ronaldo',
    'pele',
    'maradona',
    'zidane',
    'cruyff',
    'panenka',
    'beckham',
    'mbappe',
    'haaland',
    'neymar',
    'arsenal',
    'chelsea',
    'liverpool',
    'united',
    'city',
    'madrid',
    'barcelona',
    'barca',
    'bayern',
    'juventus',
    'milan',
    'inter',
    'ajax',
    'dynamo',
    'celtic',
    'rangers',
    'boca',
    'santos',
    'nike',
    'adidas',
    'puma',
    'fifa',
    'uefa',
    'premier',
    'laliga',
    'bundesliga',
  ];

  it.each([...USERNAME_ADJECTIVES, ...USERNAME_NOUNS])('%s is generic vocabulary', (word) => {
    const lower = word.toLowerCase();
    for (const banned of FORBIDDEN) {
      expect(lower).not.toContain(banned);
    }
  });
});

describe('generateUuid', () => {
  it('produces RFC-4122 v4 shaped ids and no duplicates', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const id = generateUuid();
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      seen.add(id);
    }
    expect(seen.size).toBe(100);
  });
});
