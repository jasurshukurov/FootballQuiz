import { getAllTopLists, getDailyTopList, matchGuess, TopList } from '@/lib/topListsGenerator';

function listById(id: string): TopList {
  const list = getAllTopLists().find((l) => l.id === id);
  if (!list) throw new Error(`missing test list ${id}`);
  return list;
}

describe('topListsGenerator', () => {
  it('validates and rank-sorts the lists', () => {
    const lists = getAllTopLists();
    expect(lists.length).toBeGreaterThanOrEqual(8);
    for (const list of lists) {
      expect(list.entries.length).toBeGreaterThan(0);
      const ranks = list.entries.map((e) => e.rank);
      expect([...ranks].sort((a, b) => a - b)).toEqual(ranks);
    }
  });

  it('picks a deterministic list per date', () => {
    expect(getDailyTopList('2026-07-13').id).toBe(getDailyTopList('2026-07-13').id);
  });

  it('does not repeat a list across consecutive days within the pool size', () => {
    const poolSize = getAllTopLists().length;
    const ids = new Set<string>();
    const base = new Date('2026-07-13T00:00:00');
    for (let i = 0; i < poolSize; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      ids.add(getDailyTopList(dateStr).id);
    }
    expect(ids.size).toBe(poolSize);
  });

  // Derive expected indices from the data so the tests survive dataset
  // refreshes (entry positions shift as real-world records update).
  function indexOfEntry(list: TopList, nameFragment: string): number {
    const idx = list.entries.findIndex((e) =>
      e.name.toLowerCase().includes(nameFragment.toLowerCase()),
    );
    if (idx < 0) throw new Error(`entry '${nameFragment}' not in ${list.id}`);
    return idx;
  }

  it('fuzzy-matches names and aliases (diacritic-insensitive)', () => {
    const wc = listById('world-cup-all-time-top-scorers');
    // exact surname alias
    expect(matchGuess(wc, 'Klose')).toBe(indexOfEntry(wc, 'Klose'));
    // diacritics folded ("müller" and "muller" both hit Gerd Muller)
    expect(matchGuess(wc, 'müller')).toBe(indexOfEntry(wc, 'Muller'));
    // full name
    expect(matchGuess(wc, 'Lionel Messi')).toBe(indexOfEntry(wc, 'Messi'));

    const ucl = listById('ucl-all-time-top-scorers');
    expect(matchGuess(ucl, 'CR7')).toBe(indexOfEntry(ucl, 'Cristiano Ronaldo'));
  });

  it('rejects garbage and too-short guesses', () => {
    const wc = listById('world-cup-all-time-top-scorers');
    expect(matchGuess(wc, 'K')).toBeNull();
    expect(matchGuess(wc, 'zzzzzzz')).toBeNull();
    expect(matchGuess(wc, 'the quick brown fox')).toBeNull();
  });
});
