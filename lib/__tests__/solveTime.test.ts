import { formatDuration, buildShareTimeSuffix } from '@/lib/solveTime';

describe('formatDuration', () => {
  it('formats sub-minute times with a zero minute', () => {
    expect(formatDuration(7_000)).toBe('0:07');
    expect(formatDuration(0)).toBe('0:00');
  });

  it('formats minutes:seconds', () => {
    expect(formatDuration(161_000)).toBe('2:41');
    expect(formatDuration(60_000)).toBe('1:00');
    expect(formatDuration(599_999)).toBe('9:59');
  });

  it('formats hours when the solve runs long', () => {
    expect(formatDuration(3_731_000)).toBe('1:02:11');
  });

  it('clamps negative and non-finite input', () => {
    expect(formatDuration(-5_000)).toBe('0:00');
    expect(formatDuration(Number.NaN)).toBe('0:00');
  });
});

describe('buildShareTimeSuffix', () => {
  it('builds the stopwatch line', () => {
    expect(buildShareTimeSuffix(161_000)).toBe('⏱ 2:41');
  });

  it('returns null when no time was recorded', () => {
    expect(buildShareTimeSuffix(null)).toBeNull();
    expect(buildShareTimeSuffix(undefined)).toBeNull();
    expect(buildShareTimeSuffix(-1)).toBeNull();
  });
});
