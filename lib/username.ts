/**
 * Random football-flavored usernames for the local-first identity
 * (hooks/useIdentityStore.ts). Shape: Adjective + FootballNoun + number,
 * e.g. "SwiftVolley42" or "MidfieldMaestro7".
 *
 * IP-FREE RULE: the pools contain ONLY generic football vocabulary. No real
 * player, club, competition or brand names (enforced by lib/__tests__/username.test.ts).
 */

export const USERNAME_ADJECTIVES = [
  'Swift',
  'Golden',
  'Rapid',
  'Clever',
  'Mighty',
  'Silent',
  'Turbo',
  'Iron',
  'Lucky',
  'Brave',
  'Prime',
  'Nimble',
  'Electric',
  'Blazing',
  'Crafty',
  'Daring',
  'Flying',
  'Grand',
  'Humble',
  'Jolly',
  'Keen',
  'Loyal',
  'Magic',
  'Noble',
  'Quick',
  'Rocket',
  'Solar',
  'Vivid',
  'Wild',
  'Zesty',
  'Cosmic',
  'Fearless',
  'Gritty',
  'Heroic',
  'Stellar',
  'Midfield',
  'Clinical',
  'Composed',
  'Tidy',
  'Roaming',
] as const;

export const USERNAME_NOUNS = [
  'Volley',
  'Striker',
  'Keeper',
  'Winger',
  'Sweeper',
  'Poacher',
  'Maestro',
  'Nutmeg',
  'Screamer',
  'Worldie',
  'Dribbler',
  'Gaffer',
  'Baller',
  'Crossbar',
  'Curler',
  'Backheel',
  'Rabona',
  'Playmaker',
  'Freekick',
  'Header',
  'Toepoke',
  'Skipper',
  'Anchor',
  'Engine',
  'Wizard',
  'Libero',
  'Regista',
  'Fullback',
  'Wingback',
  'Stopper',
  'Halfspace',
  'Overlap',
  'Pivot',
  'Talisman',
  'Metronome',
] as const;

/** Random number generator contract: returns a float in [0, 1). */
export type Rng = () => number;

function pick<T>(pool: readonly T[], rng: Rng): T {
  const index = Math.min(pool.length - 1, Math.floor(rng() * pool.length));
  return pool[Math.max(0, index)];
}

/**
 * Generate a username like "SwiftVolley42". Deterministic when given a seeded
 * rng (lib/dailySeed createSeededRandom); defaults to Math.random.
 */
export function generateUsername(rng: Rng = Math.random): string {
  const adjective = pick(USERNAME_ADJECTIVES, rng);
  const noun = pick(USERNAME_NOUNS, rng);
  // 1..99, no zero-padding (matches the "MidfieldMaestro7" flavor).
  const number = 1 + Math.min(98, Math.floor(rng() * 99));
  return `${adjective}${noun}${number}`;
}

/**
 * UUID v4 (RFC 4122 layout). Prefers crypto randomness when the platform
 * provides it (web); falls back to Math.random. This is a game identity,
 * not a security credential, so the fallback is acceptable.
 */
export function generateUuid(): string {
  const bytes = new Uint8Array(16);
  const cryptoObj = (globalThis as { crypto?: Crypto }).crypto;
  if (cryptoObj?.getRandomValues) {
    cryptoObj.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
