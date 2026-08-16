import { describe, it, expect, vi } from 'vitest';
import { dateRange } from '@/server/reports';

vi.mock('@/lib/prisma', () => ({ default: {} }));

const startOfDay = (date: string) => new Date(date);
const endOfDay = (date: string) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};
const iso = (date: Date) => date.toISOString();

describe('dateRange', () => {
  it('returns undefined when no dates are provided', () => {
    expect(dateRange()).toBeUndefined();
    expect(dateRange(undefined, undefined)).toBeUndefined();
  });

  it('builds a gte-only range from a valid from', () => {
    expect(dateRange('2026-08-01', undefined)).toEqual({
      gte: startOfDay('2026-08-01'),
    });
  });

  it('sets the end of a to-day at 23:59:59.999 local time', () => {
    expect(dateRange(undefined, '2026-08-10')).toEqual({
      lte: endOfDay('2026-08-10'),
    });
  });

  it('combines a from and an inclusive to', () => {
    const range = dateRange('2026-08-01', '2026-08-10');
    expect(iso(range!.gte!)).toBe(iso(startOfDay('2026-08-01')));
    expect(iso(range!.lte!)).toBe(iso(endOfDay('2026-08-10')));
  });

  it('ignores invalid date strings on either side', () => {
    expect(dateRange('not-a-date', undefined)).toBeUndefined();
    expect(dateRange('not-a-date', '2026-08-10')).toEqual({
      lte: endOfDay('2026-08-10'),
    });
    const onlyFrom = dateRange('2026-08-01', 'garbage');
    expect(iso(onlyFrom!.gte!)).toBe(iso(startOfDay('2026-08-01')));
    expect(onlyFrom!.lte).toBeUndefined();
  });

  it('builds a date range that spans the full to-day', () => {
    const range = dateRange('2026-08-01', '2026-08-10')!;
    expect(range.lte!.getTime() - range.gte!.getTime()).toBe(
      endOfDay('2026-08-10').getTime() - startOfDay('2026-08-01').getTime()
    );
  });
});