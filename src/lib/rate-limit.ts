// Sliding-window rate limiter.
// - If REDIS_URL is set, uses Redis with atomic INCR + EXPIRE (works across instances).
// - Otherwise falls back to an in-memory Map (single-node only).
//
// The in-memory path is OK for a single container; for horizontally-scaled
// Coolify/Fly.io/Vercel deploys, set REDIS_URL (e.g. upstash, internal Redis).

import Redis from 'ioredis'

let redis: Redis | null = null
function getRedis(): Redis | null {
  if (redis !== null) return redis
  const url = process.env.REDIS_URL
  if (!url) return null
  try {
    redis = new Redis(url, {
      lazyConnect: false,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 2,
    })
    redis.on('error', (err) => {
      console.error('[rate-limit] redis error', err.message)
    })
    return redis
  } catch (err) {
    console.error('[rate-limit] redis init failed, falling back to memory', err)
    return null
  }
}

// --- In-memory fallback ---
const buckets = new Map<string, { count: number; resetAt: number }>()
let cleanupTimer: ReturnType<typeof setInterval> | null = null
function ensureCleanup() {
  if (cleanupTimer) return
  cleanupTimer = setInterval(() => {
    const now = Date.now()
    for (const [k, v] of buckets) if (v.resetAt < now) buckets.delete(k)
  }, 60_000)
  cleanupTimer.unref?.()
}

function memoryLimit(
  key: string,
  limit: number,
  windowSec: number
): { allowed: boolean; remaining: number; resetAt: number } {
  ensureCleanup()
  const now = Date.now()
  const b = buckets.get(key)
  if (!b || b.resetAt < now) {
    const resetAt = now + windowSec * 1000
    buckets.set(key, { count: 1, resetAt })
    return { allowed: true, remaining: limit - 1, resetAt }
  }
  if (b.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: b.resetAt }
  }
  b.count++
  return { allowed: true, remaining: limit - b.count, resetAt: b.resetAt }
}

export async function rateLimitAsync(
  key: string,
  limit: number,
  windowSec: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const client = getRedis()
  if (!client) return memoryLimit(key, limit, windowSec)

  const redisKey = `rl:${key}`
  try {
    const results = await client
      .multi()
      .incr(redisKey)
      .pttl(redisKey)
      .exec()
    if (!results) return memoryLimit(key, limit, windowSec)
    const count = Number(results[0]?.[1] ?? 0)
    let ttl = Number(results[1]?.[1] ?? -1)
    if (ttl < 0) {
      await client.pexpire(redisKey, windowSec * 1000)
      ttl = windowSec * 1000
    }
    const resetAt = Date.now() + ttl
    if (count > limit) {
      return { allowed: false, remaining: 0, resetAt }
    }
    return { allowed: true, remaining: Math.max(0, limit - count), resetAt }
  } catch (err) {
    console.error('[rate-limit] redis err — fallback to memory', err)
    return memoryLimit(key, limit, windowSec)
  }
}

// Sync version kept for backward compatibility (memory-only).
// Prefer rateLimitAsync() in new code.
export function rateLimit(
  key: string,
  limit: number,
  windowSec: number
): { allowed: boolean; remaining: number; resetAt: number } {
  return memoryLimit(key, limit, windowSec)
}
