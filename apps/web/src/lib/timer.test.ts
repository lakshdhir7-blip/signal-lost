import { describe, expect, it } from 'vitest';
import { corruptionPercent, formatMMSS, MISSION_DURATION_MS, remainingMs } from './timer';

describe('timer utils', () => {
  it('formats mm:ss correctly', () => {
    expect(formatMMSS(0)).toBe('00:00');
    expect(formatMMSS(1000)).toBe('00:01');
    expect(formatMMSS(60_000)).toBe('01:00');
    expect(formatMMSS(90 * 60_000)).toBe('90:00');
    expect(formatMMSS(-5)).toBe('00:00');
  });

  it('remainingMs returns full duration for null startedAt', () => {
    expect(remainingMs(null)).toBe(MISSION_DURATION_MS);
  });

  it('corruptionPercent scales with elapsed time', () => {
    const now = Date.now();
    expect(corruptionPercent(null)).toBe(0);
    const pastStart = now - 30 * 60_000; // halfway through 90 min
    const pct = corruptionPercent(pastStart);
    expect(pct).toBeGreaterThan(25);
    expect(pct).toBeLessThan(50);
  });
});
