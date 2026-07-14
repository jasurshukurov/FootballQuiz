import { getBandedCareerPool, getCareerPlayerForDate, getCareerFameScore } from '../careerData';
import { computeProximity, careerClueRank } from '../careerHelpers';
import { CareerPlayer } from '../../types/career';

const MONDAY = '2026-07-13'; // easy band (fame 85-101)
const SATURDAY = '2026-07-18'; // expert band (fame 58-72)

function meanFame(players: CareerPlayer[]): number {
  const scores = players.map((p) => getCareerFameScore(p) ?? 0);
  return scores.reduce((a, b) => a + b, 0) / (scores.length || 1);
}

describe('band-gated Career Path pool', () => {
  it('serves more famous careers early in the week than on the weekend', () => {
    const mon = getBandedCareerPool(MONDAY);
    const sat = getBandedCareerPool(SATURDAY);
    expect(mon.length).toBeGreaterThan(0);
    expect(sat.length).toBeGreaterThan(0);
    // Monday's easy band should sit clearly above Saturday's expert band.
    expect(meanFame(mon)).toBeGreaterThan(meanFame(sat));
  });

  it('every banded player still has >= 3 career stints', () => {
    for (const dateStr of [MONDAY, SATURDAY, '2026-07-19']) {
      for (const p of getBandedCareerPool(dateStr)) {
        expect(p.career.length).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('is deterministic for a given date', () => {
    expect(getCareerPlayerForDate(MONDAY).name).toBe(getCareerPlayerForDate(MONDAY).name);
    expect(getCareerPlayerForDate(SATURDAY).name).toBe(getCareerPlayerForDate(SATURDAY).name);
  });

  it('the daily pick is a valid, guessable player', () => {
    const p = getCareerPlayerForDate(MONDAY);
    expect(p.career.length).toBeGreaterThanOrEqual(3);
    expect(p.name.length).toBeGreaterThan(0);
  });
});

describe('proximity chips', () => {
  const answer: CareerPlayer = {
    id: 1,
    name: 'Lionel Messi',
    normalized_name: 'lionel messi',
    nationality: 'Argentina',
    position: 'Forward',
    image_url: '',
    tier: 'legendary',
    career: [
      { club: 'FC Barcelona', from: 2004, to: 2021 },
      { club: 'Paris Saint-Germain', from: 2021, to: 2023 },
      { club: 'Inter Miami CF', from: 2023, to: 2025 },
    ],
  };

  it('matches the answer against itself on every axis', () => {
    const chips = computeProximity('Lionel Messi', answer);
    expect(chips).not.toBeNull();
    expect(chips!.nationality).toBe(true);
    expect(chips!.position).toBe(true);
    expect(chips!.era).toBe(true); // fully overlapping career
  });

  it('never reports a match for two unknown attributes', () => {
    const chips = computeProximity('a totally unknown name xyz', answer);
    // Unknown guess resolves to no data; nothing may falsely match.
    expect(chips!.nationality).toBe(false);
    expect(chips!.position).toBe(false);
    expect(chips!.league).toBe(false);
    expect(chips!.era).toBe(false);
  });
});

describe('career clue-economy rank', () => {
  it('a hint-free first-try solve is the top tier', () => {
    expect(careerClueRank(true, 0, 0).nextLabel).toBeNull();
  });

  it('a loss is the bottom tier', () => {
    expect(careerClueRank(false, 3, 4).tier).toBe(0);
  });

  it('spending more attempts or hints never raises the tier', () => {
    // more attempts used -> tier non-increasing
    for (let hints = 0; hints <= 4; hints++) {
      let prev = careerClueRank(true, 0, hints).tier;
      for (let att = 1; att <= 2; att++) {
        const cur = careerClueRank(true, att, hints).tier;
        expect(cur).toBeLessThanOrEqual(prev);
        prev = cur;
      }
    }
    // more hints used -> tier non-increasing
    for (let att = 0; att <= 2; att++) {
      let prev = careerClueRank(true, att, 0).tier;
      for (let hints = 1; hints <= 4; hints++) {
        const cur = careerClueRank(true, att, hints).tier;
        expect(cur).toBeLessThanOrEqual(prev);
        prev = cur;
      }
    }
  });
});
