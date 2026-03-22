import { NextResponse } from 'next/server'
import { z } from 'zod'
import { scanBrandFree } from '@/lib/scanner'
import { calculateGlobalScore, calculateLLMScore } from '@/lib/analysis'

const freeScanSchema = z.object({
  brand: z.string().min(1).max(100).trim(),
})

// IP-based rate limiter: max 3 requests per IP per day
const ipRateLimitMap = new Map<string, { count: number; resetAt: number }>()
const MAX_FREE_SCANS_PER_DAY = 3

function getClientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return 'unknown'
}

export async function POST(req: Request) {
  const body = await req.json()
  const parsed = freeScanSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { brand } = parsed.data
  const ip = getClientIp(req)
  const now = Date.now()
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  const resetAt = startOfDay.getTime() + 24 * 60 * 60 * 1000

  const entry = ipRateLimitMap.get(ip)
  if (entry && now < entry.resetAt) {
    if (entry.count >= MAX_FREE_SCANS_PER_DAY) {
      return NextResponse.json(
        { error: `Limite atteinte : ${MAX_FREE_SCANS_PER_DAY} scans gratuits par jour. Créez un compte pour continuer.` },
        { status: 429 }
      )
    }
    ipRateLimitMap.set(ip, { count: entry.count + 1, resetAt: entry.resetAt })
  } else {
    ipRateLimitMap.set(ip, { count: 1, resetAt })
  }

  // Clean up old entries periodically
  if (ipRateLimitMap.size > 2000) {
    for (const [k, v] of ipRateLimitMap.entries()) {
      if (now > v.resetAt) ipRateLimitMap.delete(k)
    }
  }

  const query = `Quelles sont les meilleures options ou alternatives dans le même secteur que ${brand} ?`
  const results = await scanBrandFree(brand, query)

  const globalScore = calculateGlobalScore(results)

  return NextResponse.json({
    brand,
    globalScore,
    results: results.map((r) => ({
      llm: r.llm,
      mentioned: r.mentioned,
      position: r.position,
      context: r.context ? r.context.slice(0, 200) : null,
      sentiment: r.sentiment,
      competitors: r.competitors.slice(0, 3),
      score: calculateLLMScore(r),
    })),
    isPartial: true,
    lockedLlms: ['CLAUDE', 'PERPLEXITY'],
    message: 'Résultats partiels — 2 LLMs sur 4 analysés. Créez un compte pour voir le rapport complet.',
  })
}
