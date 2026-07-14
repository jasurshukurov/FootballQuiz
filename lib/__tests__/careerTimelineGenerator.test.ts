import {
  clubNamesMatch,
  generateCareerTimelinePuzzle,
  HIDDEN_COUNT,
} from '@/lib/careerTimelineGenerator';

describe('clubNamesMatch (canonical equality)', () => {
  it('rejects different clubs that share a leading word', () => {
    // The old substring/alias-contains matcher let "Real Sociedad" satisfy a
    // "Real Madrid" target via the shared "Real" prefix. Canonical equality must
    // treat them as distinct.
    expect(clubNamesMatch('Real Sociedad', 'Real Madrid')).toBe(false);
    expect(clubNamesMatch('Real Madrid', 'Real Sociedad')).toBe(false);
    expect(clubNamesMatch('Real Betis', 'Real Madrid')).toBe(false);
    expect(clubNamesMatch('Atletico Madrid', 'Real Madrid')).toBe(false);
  });

  it('accepts the same club regardless of diacritics/casing', () => {
    expect(clubNamesMatch('real madrid', 'Real Madrid')).toBe(true);
    expect(clubNamesMatch('Atlético de Madrid', 'Atletico de Madrid')).toBe(true);
  });

  it('accepts curated synonyms only', () => {
    expect(clubNamesMatch('Man Utd', 'Manchester United')).toBe(true);
    expect(clubNamesMatch('Man United', 'Manchester United')).toBe(true);
    expect(clubNamesMatch('Spurs', 'Tottenham Hotspur')).toBe(true);
    // Not a curated synonym pair, and not the same club:
    expect(clubNamesMatch('Manchester United', 'Manchester City')).toBe(false);
  });

  it('never matches an empty/garbage guess to a real club', () => {
    expect(clubNamesMatch('', 'Real Madrid')).toBe(false);
    expect(clubNamesMatch('   ', 'Real Madrid')).toBe(false);
  });
});

describe('generateCareerTimelinePuzzle', () => {
  const seeds = [1, 42, 777, 100234, 5];

  it('hides exactly HIDDEN_COUNT middle clubs for score comparability', () => {
    for (let day = 0; day < 30; day++) {
      const puzzle = generateCareerTimelinePuzzle(123 + day, day, '2026-07-13');
      expect(puzzle.totalHidden).toBe(HIDDEN_COUNT);
      const hidden = puzzle.nodes.filter((n) => n.isHidden);
      expect(hidden).toHaveLength(HIDDEN_COUNT);
      // First and last stints are always revealed.
      expect(puzzle.nodes[0].isHidden).toBe(false);
      expect(puzzle.nodes[puzzle.nodes.length - 1].isHidden).toBe(false);
    }
  });

  it('is deterministic for a fixed seed + day + date', () => {
    const a = generateCareerTimelinePuzzle(999, 4, '2026-07-13');
    const b = generateCareerTimelinePuzzle(999, 4, '2026-07-13');
    expect(a).toEqual(b);
  });

  it('picks a player with enough stints to hide HIDDEN_COUNT middles', () => {
    for (const seed of seeds) {
      const puzzle = generateCareerTimelinePuzzle(seed, seed, '2026-07-18');
      expect(puzzle.nodes.length).toBeGreaterThanOrEqual(HIDDEN_COUNT + 2);
    }
  });
});
