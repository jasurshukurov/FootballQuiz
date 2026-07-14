import { getRank, getStreakRank, STREAK_MILESTONES } from '../rankLadder';

describe('getRank (bounded score)', () => {
  it('maps a zero score to the bottom tier (Kickoff)', () => {
    const rank = getRank(0, 100);
    expect(rank.label).toBe('Kickoff');
    expect(rank.tier).toBe(0);
    expect(rank.nextLabel).toBe('Squad Rotation');
  });

  it('maps a perfect score to the top tier with no next rank', () => {
    const rank = getRank(100, 100);
    expect(rank.label).toBe('Ballon d’Or');
    expect(rank.tier).toBe(5);
    expect(rank.nextLabel).toBeNull();
    expect(rank.toNext).toBe(0);
  });

  it('places each band boundary in the expected tier', () => {
    // Boundaries: 0.25, 0.5, 0.7, 0.85, 1 (max = 100 → score == pct*100).
    expect(getRank(24, 100).label).toBe('Kickoff');
    expect(getRank(25, 100).label).toBe('Squad Rotation');
    expect(getRank(49, 100).label).toBe('Squad Rotation');
    expect(getRank(50, 100).label).toBe('First Team');
    expect(getRank(69, 100).label).toBe('First Team');
    expect(getRank(70, 100).label).toBe('Captain');
    expect(getRank(84, 100).label).toBe('Captain');
    expect(getRank(85, 100).label).toBe('World Class');
    expect(getRank(99, 100).label).toBe('World Class');
    expect(getRank(100, 100).label).toBe('Ballon d’Or');
  });

  it('computes toNext as the points needed to reach the next band', () => {
    // From 0/100: next band (Squad Rotation) starts at ceil(0.25*100)=25.
    expect(getRank(0, 100).toNext).toBe(25);
    // From 50/100 (First Team): next band (Captain) starts at ceil(0.7*100)=70.
    expect(getRank(50, 100).toNext).toBe(20);
    // From 85/100 (World Class): next band (Ballon d’Or) starts at 100.
    expect(getRank(85, 100).toNext).toBe(15);
  });

  it('never returns a toNext below 1 while a next band exists', () => {
    // 99/100 is World Class; the ceil could round to the current score, but the
    // goal-gradient must always show at least 1 to go.
    expect(getRank(99, 100).toNext).toBeGreaterThanOrEqual(1);
  });

  it('clamps out-of-range scores instead of overflowing the ladder', () => {
    expect(getRank(-5, 100).label).toBe('Kickoff');
    expect(getRank(200, 100).label).toBe('Ballon d’Or');
    expect(getRank(200, 100).nextLabel).toBeNull();
  });

  it('degrades gracefully when max is non-positive', () => {
    const rank = getRank(3, 0);
    expect(rank.label).toBe('Kickoff');
    expect(rank.tier).toBe(0);
    expect(rank.nextLabel).toBe('Squad Rotation');
    expect(rank.toNext).toBe(1);
  });

  it('is monotonic: tier never decreases as score rises', () => {
    let prevTier = -1;
    for (let score = 0; score <= 20; score++) {
      const tier = getRank(score, 20).tier;
      expect(tier).toBeGreaterThanOrEqual(prevTier);
      prevTier = tier;
    }
  });
});

describe('getStreakRank (unbounded streak)', () => {
  it('places each streak threshold in the expected tier', () => {
    expect(getStreakRank(0).label).toBe('Kickoff');
    expect(getStreakRank(2).label).toBe('Kickoff');
    expect(getStreakRank(3).label).toBe('Squad Rotation');
    expect(getStreakRank(5).label).toBe('Squad Rotation');
    expect(getStreakRank(6).label).toBe('First Team');
    expect(getStreakRank(10).label).toBe('Captain');
    expect(getStreakRank(15).label).toBe('World Class');
    expect(getStreakRank(21).label).toBe('Ballon d’Or');
  });

  it('computes toNext as the streak still needed for the next tier', () => {
    expect(getStreakRank(0).toNext).toBe(3); // → Squad Rotation at 3
    expect(getStreakRank(3).toNext).toBe(3); // → First Team at 6
    expect(getStreakRank(6).toNext).toBe(4); // → Captain at 10
  });

  it('tops out at Ballon d’Or with no next rank for very long streaks', () => {
    const rank = getStreakRank(100);
    expect(rank.label).toBe('Ballon d’Or');
    expect(rank.nextLabel).toBeNull();
    expect(rank.toNext).toBe(0);
  });

  it('is monotonic across the streak range', () => {
    let prevTier = -1;
    for (let streak = 0; streak <= 25; streak++) {
      const tier = getStreakRank(streak).tier;
      expect(tier).toBeGreaterThanOrEqual(prevTier);
      prevTier = tier;
    }
  });
});

describe('STREAK_MILESTONES', () => {
  it('are strictly ascending celebration thresholds', () => {
    expect([...STREAK_MILESTONES]).toEqual([5, 10, 15, 21]);
    for (let i = 1; i < STREAK_MILESTONES.length; i++) {
      expect(STREAK_MILESTONES[i]).toBeGreaterThan(STREAK_MILESTONES[i - 1]);
    }
  });
});
