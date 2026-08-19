import { describe, it, expect, vi, beforeEach } from 'vitest';

interface FakeRedisLike {
  store: Map<string, string>;
  setCalls: unknown[][];
  on: (event: string, handler: () => void) => unknown;
}

let fake: FakeRedisLike | undefined;
let failReads: boolean;

beforeEach(() => {
  fake = undefined;
  failReads = false;
  vi.resetModules();
  vi.doMock('ioredis', () => {
    class FakeRedis {
      store = new Map<string, string>();
      setCalls: unknown[][] = [];

      constructor() {
        fake = this as unknown as FakeRedisLike;
      }

      on() {
        return this;
      }

      async get(key: string) {
        if (failReads) throw new Error('redis unavailable');
        return this.store.get(key) ?? null;
      }

      async set(key: string, value: string, ...args: unknown[]) {
        if (failReads) throw new Error('redis unavailable');
        this.setCalls.push([key, value, ...args]);
        this.store.set(key, value);
        return 'OK';
      }

      async del(...keys: unknown[]) {
        if (failReads) throw new Error('redis unavailable');
        let removed = 0;
        for (const key of keys.flat() as string[]) {
          if (this.store.delete(key)) removed += 1;
        }
        return removed;
      }
    }
    return { default: FakeRedis };
  });
});

describe('cache module', () => {
  it('is a no-op with no REDIS_URL (graceful fallback)', async () => {
    delete process.env.REDIS_URL;
    const cache = await import('@/lib/cache');

    expect(cache.CACHE_TTL_SECONDS).toBe(60);
    expect(Object.values(cache.CACHE_KEYS)).toHaveLength(3);
    expect(await cache.getCached('anything')).toBeNull();
    await expect(cache.setCached('k', { a: 1 })).resolves.toBeUndefined();
    await expect(cache.invalidateAggregateCaches()).resolves.toBeUndefined();
    expect(fake).toBeUndefined();
  });

  it('round-trips JSON values with the default 60s TTL', async () => {
    process.env.REDIS_URL = 'redis://localhost:6379';
    const cache = await import('@/lib/cache');

    const value = { a: 1, b: 'x', nested: { ok: true } };
    await cache.setCached('key', value);

    expect(await cache.getCached<typeof value>('key')).toEqual(value);
    expect(fake?.setCalls[0]).toEqual([
      'key',
      JSON.stringify(value),
      'EX',
      60,
    ]);
  });

  it('returns null for a missing key', async () => {
    process.env.REDIS_URL = 'redis://localhost:6379';
    const cache = await import('@/lib/cache');

    expect(await cache.getCached('missing')).toBeNull();
  });

  it('honours a custom TTL', async () => {
    process.env.REDIS_URL = 'redis://localhost:6379';
    const cache = await import('@/lib/cache');

    await cache.setCached('key', { v: 1 }, 30);
    expect(fake?.setCalls[0]).toEqual(['key', JSON.stringify({ v: 1 }), 'EX', 30]);
  });

  it('invalidateAggregateCaches removes every aggregate key', async () => {
    process.env.REDIS_URL = 'redis://localhost:6379';
    const cache = await import('@/lib/cache');

    await cache.setCached(cache.CACHE_KEYS.dashboardAggregates, { v: 1 });
    await cache.setCached(cache.CACHE_KEYS.reportsMaintenance, { v: 2 });
    await cache.setCached(cache.CACHE_KEYS.reportsDowntime, { v: 3 });

    await cache.invalidateAggregateCaches();

    expect(
      await cache.getCached(cache.CACHE_KEYS.dashboardAggregates)
    ).toBeNull();
    expect(await cache.getCached(cache.CACHE_KEYS.reportsMaintenance)).toBeNull();
    expect(await cache.getCached(cache.CACHE_KEYS.reportsDowntime)).toBeNull();
  });

  it('returns null instead of throwing when Redis fails', async () => {
    process.env.REDIS_URL = 'redis://localhost:6379';
    failReads = true;
    const cache = await import('@/lib/cache');

    expect(await cache.getCached('key')).toBeNull();
    await expect(cache.setCached('key', { v: 1 })).resolves.toBeUndefined();
    await expect(cache.invalidateAggregateCaches()).resolves.toBeUndefined();
  });
});