import { describe, it, expect, vi } from 'vitest';
import {
  downtimeDurationMinutes,
  formatDowntimeDuration,
} from '@/server/downtime';

vi.mock('@/lib/prisma', () => ({ default: {} }));

function dateMinutesAgo(minutes: number): Date {
  return new Date(Date.now() - minutes * 60 * 1000);
}

describe('downtimeDurationMinutes', () => {
  it('returns null for an ongoing event', () => {
    expect(
      downtimeDurationMinutes({ startedAt: new Date(), endedAt: null })
    ).toBeNull();
  });

  it('computes the whole-minute duration between start and end', () => {
    const startedAt = dateMinutesAgo(95);
    const endedAt = new Date();
    expect(
      downtimeDurationMinutes({ startedAt, endedAt })
    ).toBe(95);
  });

  it('never returns a negative duration', () => {
    const startedAt = new Date();
    const endedAt = dateMinutesAgo(30);
    expect(
      downtimeDurationMinutes({ startedAt, endedAt })
    ).toBe(0);
  });

  it('rounds partial minutes to the nearest minute', () => {
    const startedAt = new Date(Date.now() - 60 * 60 * 1000 - 30 * 1000);
    const endedAt = new Date();
    expect(downtimeDurationMinutes({ startedAt, endedAt })).toBe(61);
  });
});

describe('formatDowntimeDuration', () => {
  it('formats an ongoing event', () => {
    expect(formatDowntimeDuration(null)).toBe('Ongoing');
  });

  it('formats zero minutes as 0m', () => {
    expect(formatDowntimeDuration(0)).toBe('0m');
  });

  it.each([
    [45, '45m'],
    [5, '5m'],
    [60, '1h'],
    [120, '2h'],
    [90, '1h 30m'],
    [1, '1m'],
    [119, '1h 59m'],
  ])('formats %i minutes as %s', (minutes, expected) => {
    expect(formatDowntimeDuration(minutes)).toBe(expected);
  });
});