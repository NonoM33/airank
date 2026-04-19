// Simple in-memory sliding-window rate limiter.
// For multi-instance deploys, swap with Redis/Upstash. Good enough for single node.

const buckets = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(
  key: string,
  limit: number,
  windowSec: number
): { allowed: boolean; remaining: number; resetAt: number } {
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

// Periodic cleanup
setInterval(() => {
  const now = Date.now()
  for (const [k, v] of buckets) if (v.resetAt < now) buckets.delete(k)
}, 60_000)
