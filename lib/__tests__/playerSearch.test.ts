// Fame-blended player search — ranking contract tests against the REAL DB.
// Accuracy buckets first (exact > prefix > word-prefix > substring > fuzzy),
// fame only orders players inside a bucket.

import { searchPlayers, createPlayerSearchEngine, foldSearchText } from '@/lib/playerSearch';
import { getAllPlayers } from '@/lib/playerData';
import { shortenClubName } from '@/lib/clubNames';
import { Player } from '@/types/player';

describe('foldSearchText', () => {
  it('strips diacritics, case and punctuation', () => {
    expect(foldSearchText('Kylian Mbappé')).toBe('kylian mbappe');
    expect(foldSearchText('Özil')).toBe('ozil');
    expect(foldSearchText('Son Heung-min')).toBe('son heung min');
  });
});

describe('searchPlayers ranking (real DB)', () => {
  it('"ron" puts the most famous Ronaldo-types first', () => {
    const names = searchPlayers('ron', { limit: 8 }).map((p) => p.name);
    expect(names[0]).toBe('Cristiano Ronaldo');
    // The other superstar Ronaldos outrank obscure literal Ron-players.
    expect(names.slice(0, 4)).toEqual(
      expect.arrayContaining(['Ronaldo de Assis Moreira', 'Ronaldo Nazario']),
    );
  });

  it('an exact full-name match ranks #1 even for an obscure player', () => {
    // "Ronaldo" (Fk Rostov, fame ~32) is an exact match; Cristiano (fame ~99)
    // is only a last-name-prefix match and must come second.
    const results = searchPlayers('ronaldo', { limit: 5 });
    expect(results[0].name).toBe('Ronaldo');
    expect(results[1].name).toBe('Cristiano Ronaldo');
  });

  it('typing out an arbitrary obscure full name returns that player first', () => {
    // Pick a genuinely low-profile player from the DB (no fame entry needed).
    // The DB holds two namesakes ("Damien Perquis"), so assert on the exact
    // name ranking first rather than a specific id.
    const all = getAllPlayers();
    const obscure = all.find((p) => p.name === 'Damien Perquis') ?? all[all.length - 1];
    const results = searchPlayers(obscure.name);
    expect(results[0].name).toBe(obscure.name);
  });

  it('"mba" surfaces Mbappé on top (fame tiebreak inside the prefix bucket)', () => {
    const results = searchPlayers('mba', { limit: 5 });
    expect(results[0].name).toBe('Kylian Mbappé');
  });

  it('is diacritics-insensitive in both directions', () => {
    // Accented query -> unaccented DB name.
    expect(searchPlayers('Özil', { limit: 3 }).map((p) => p.name)).toContain('Mesut Ozil');
    // Unaccented query -> accented DB name.
    expect(searchPlayers('mbappe', { limit: 3 })[0].name).toBe('Kylian Mbappé');
    // Plain query still tops the accented star.
    expect(searchPlayers('ozil', { limit: 3 })[0].name).toBe('Mesut Ozil');
  });

  it('matches on any name token, not just the start of the string', () => {
    const results = searchPlayers('bruyne', { limit: 3 });
    expect(results[0].name).toBe('Kevin De Bruyne');
    // Multi-token queries match a run of tokens ("de bru" -> Kevin De Bruyne).
    expect(searchPlayers('de bru', { limit: 3 })[0].name).toBe('Kevin De Bruyne');
  });

  it('never lets fame promote a fuzzy match above a textual match', () => {
    const results = searchPlayers('ronaldo', { limit: 20 });
    const names = results.map((p) => p.name);
    const textual = names.filter((n) => foldSearchText(n).includes('ronaldo'));
    // Every name actually containing the query must precede every fuzzy-only hit.
    const lastTextual = Math.max(...textual.map((n) => names.indexOf(n)));
    const firstFuzzy = names.findIndex((n) => !foldSearchText(n).includes('ronaldo'));
    if (firstFuzzy !== -1) expect(firstFuzzy).toBeGreaterThan(lastTextual);
  });

  it('still finds players through typos via the fuzzy tier', () => {
    const names = searchPlayers('cristiano ronaldi', { limit: 5 }).map((p) => p.name);
    expect(names).toContain('Cristiano Ronaldo');
  });

  it('respects limit and filter options', () => {
    expect(searchPlayers('ron', { limit: 3 })).toHaveLength(3);
    const onlyAlNassr = searchPlayers('ron', {
      limit: 10,
      filter: (p) => p.current_team === 'Al-Nassr',
    });
    expect(onlyAlNassr.length).toBeGreaterThan(0);
    for (const p of onlyAlNassr) expect(p.current_team).toBe('Al-Nassr');
  });

  it('returns nothing for an empty/whitespace query', () => {
    expect(searchPlayers('')).toEqual([]);
    expect(searchPlayers('   ')).toEqual([]);
  });
});

describe('createPlayerSearchEngine (custom pools)', () => {
  const synthetic = (id: number, name: string): Player => ({
    id,
    name,
    normalized_name: foldSearchText(name),
    nationality: '',
    current_team: '',
    league: '',
    position: '',
    market_value: 0,
    image_url: '',
  });

  it('ranks fame via the name fallback for out-of-DB ids (lineup legends)', () => {
    // Synthetic ids (Missing XI guess pool style) have no fame_by_id entry;
    // fame must join by name so the legend outranks the namesake unknown.
    const engine = createPlayerSearchEngine([
      synthetic(9_000_001, 'Zinedine Zidane'),
      synthetic(9_000_002, 'Zinedine Zzz'),
    ]);
    const names = engine.search('zin').map((p) => p.name);
    expect(names[0]).toBe('Zinedine Zidane');
  });

  it('searches only within the provided pool', () => {
    const engine = createPlayerSearchEngine([synthetic(1, 'Test Player')]);
    expect(engine.search('messi')).toEqual([]);
    expect(engine.search('test')[0].name).toBe('Test Player');
  });
});

describe('shortenClubName (display shortening at search sites)', () => {
  it('shortens the official Barcelona name to the household FC form', () => {
    expect(shortenClubName('Futbol Club Barcelona')).toBe('FC Barcelona');
  });

  it('is idempotent on already-short names', () => {
    expect(shortenClubName('FC Barcelona')).toBe('FC Barcelona');
    expect(shortenClubName('Real Madrid')).toBe('Real Madrid');
    expect(shortenClubName('Arsenal')).toBe('Arsenal');
  });

  it('strips legal forms from other official names', () => {
    expect(shortenClubName('Real Madrid Club de Fútbol')).toBe('Real Madrid');
    expect(shortenClubName('Manchester City Football Club')).toBe('Manchester City');
  });
});
