import Redis from 'ioredis'

/** Time-to-live for every cached aggregate (seconds). */
export const CACHE_TTL_SECONDS = 60

/** Dashboard and reports aggregate cache keys (the only caches M15 introduces). */
export const CACHE_KEYS = {
  dashboardAggregates: 'emms:dashboard:aggregates:v1',
  reportsMaintenance: 'emms:reports:maintenance:v1',
  reportsDowntime: 'emms:reports:downtime:v1',
} as const

export type CacheKey = (typeof CACHE_KEYS)[keyof typeof CACHE_KEYS]

let client: Redis | null = null
let warned = false

function getClient(): Redis | null {
  if (!process.env.REDIS_URL) return null
  if (client) return client
  try {
    client = new Redis(process.env.REDIS_URL, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      retryStrategy: () => null,
    })
    client.on('error', () => {
      if (!warned) {
        warned = true
        console.warn('[cache] Redis error — falling back to live computation.')
      }
    })
    return client
  } catch {
    return null
  }
}

/** Best-effort JSON read. Returns null when Redis is unavailable or the key is missing. */
export async function getCached<T>(key: string): Promise<T | null> {
  const redis = getClient()
  if (!redis) return null
  try {
    const raw = await redis.get(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

/** Best-effort JSON write with the shared TTL. Never throws. */
export async function setCached<T>(
  key: string,
  value: T,
  ttl = CACHE_TTL_SECONDS
): Promise<void> {
  const redis = getClient()
  if (!redis) return
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttl)
  } catch {
    // best-effort only
  }
}

/** Best-effort delete of the given keys. Never throws. */
export async function invalidateKeys(keys: string[]): Promise<void> {
  const redis = getClient()
  if (!redis || keys.length === 0) return
  try {
    await redis.del(keys)
  } catch {
    // best-effort only
  }
}

/** Delete every M15 aggregate cache (dashboard + both report summaries). */
export async function invalidateAggregateCaches(): Promise<void> {
  await invalidateKeys(Object.values(CACHE_KEYS))
}