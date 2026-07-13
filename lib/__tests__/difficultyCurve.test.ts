import { bandForDate, filterByFameBand } from '../difficultyCurve';

describe('bandForDate', () => {
  it('gives Monday the easiest band', () => {
    // 2026-07-13 is a Monday
    const band = bandForDate('2026-07-13');
    expect(band.label).toBe('easy');
    expect(band.min).toBe(85);
  });

  it('gives Saturday the expert band', () => {
    // 2026-07-18 is a Saturday
    expect(bandForDate('2026-07-18').label).toBe('expert');
  });

  it('gives Sunday the wildcard band', () => {
    // 2026-07-19 is a Sunday
    const band = bandForDate('2026-07-19');
    expect(band.label).toBe('wildcard');
    expect(band.max).toBe(101);
  });

  it('is deterministic for a fixed date string', () => {
    expect(bandForDate('2026-07-13')).toEqual(bandForDate('2026-07-13'));
  });
});

describe('filterByFameBand', () => {
  const players = Array.from({ length: 100 }, (_, i) => ({ fame: i + 1 }));

  it('keeps only players inside the band when the pool is large enough', () => {
    const pool = filterByFameBand(players, { min: 60, max: 90, label: 'medium' }, (p) => p.fame);
    expect(pool.every((p) => p.fame >= 60 && p.fame < 90)).toBe(true);
    expect(pool.length).toBe(30);
  });

  it('widens the band rather than returning a too-small pool', () => {
    const few = [{ fame: 10 }, { fame: 50 }, { fame: 95 }];
    const pool = filterByFameBand(few, { min: 85, max: 101, label: 'easy' }, (p) => p.fame, 3);
    expect(pool.length).toBe(3); // widened all the way rather than starving
  });

  it('drops items with no fame score', () => {
    const mixed = [{ fame: undefined }, { fame: 88 }];
    const pool = filterByFameBand(mixed, { min: 85, max: 101, label: 'easy' }, (p) => p.fame, 1);
    expect(pool).toEqual([{ fame: 88 }]);
  });
});
