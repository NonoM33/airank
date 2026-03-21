import { NextResponse } from 'next/server'
import { z } from 'zod'
import { scanBrandFree } from '@/lib/scanner'
import { calculateGlobalScore, calculateLLMScore } from '@/lib/analysis'

const freeScanSchema = z.object({
  brand: z.string().min(1).max(100).trim(),
})

// Simple in-memory rate limiter: max 1 request per brand per minute
const rateLimitMap = new Map<string, number>()

export async function POST(req: Request) {
  const body = await req.json()
  const parsed = freeScanSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { brand } = parsed.data
  const key = brand.toLowerCase()
  const now = Date.now()
  const last = rateLimitMap.get(key) ?? 0

  if (now - last < 60_000) {
    return NextResponse.json(
      { error: 'Trop de requêtes. Attendez 1 minute avant de rescanner.' },
      { status: 429 }
    )
  }
  rateLimitMap.set(key, now)

  // Clean up old entries
  if (rateLimitMap.size > 1000) {
    for (const [k, t] of rateLimitMap.entries()) {
      if (now - t > 120_000) rateLimitMap.delete(k)
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
