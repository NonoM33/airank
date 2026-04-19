export const dynamic = 'force-dynamic'
import { authenticateApiRequest, logApiUsage } from '@/lib/api-auth'
import { rateLimit } from '@/lib/rate-limit'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { scanBrand } from '@/lib/scanner'
import { calculateGlobalScore, calculateLLMScore } from '@/lib/analysis'
import { useCredits, getCredits, CREDIT_COSTS } from '@/lib/credits'
import { extractCitations } from '@/lib/citations'

const schema = z.object({
  brandId: z.string(),
  query: z.string().min(1).max(500),
})

export async function POST(req: Request) {
  const t0 = Date.now()
  const authed = await authenticateApiRequest(req)
  if (!authed) return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
  if (!authed.scopes.includes('write') && !authed.scopes.includes('admin')) {
    return NextResponse.json({ error: 'Insufficient scope: write required' }, { status: 403 })
  }

  const rl = rateLimit(`api:scan:${authed.userId}`, 10, 60)
  if (!rl.allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { brandId, query } = parsed.data
  const brand = await prisma.brand.findFirst({
    where: { id: brandId, userId: authed.userId },
  })
  if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 })

  const credits = await getCredits(authed.userId)
  if (credits < CREDIT_COSTS.scan) {
    return NextResponse.json({ error: 'Insufficient credits', credits }, { status: 402 })
  }

  const results = await scanBrand(brand.name, query)
  if (results.length === 0) {
    return NextResponse.json({ error: 'No LLM available' }, { status: 503 })
  }

  const globalScore = calculateGlobalScore(results)
  const scan = await prisma.scan.create({
    data: {
      brandId,
      query,
      globalScore,
      results: {
        create: results.map((r) => ({
          llm: r.llm,
          mentioned: r.mentioned,
          position: r.position,
          context: r.context,
          sentiment: r.sentiment,
          competitors: JSON.stringify(r.competitors),
          rawResponse: r.rawResponse,
          score: calculateLLMScore(r),
        })),
      },
    },
    include: { results: true },
  })

  for (const res of scan.results) {
    const cits = extractCitations(res.rawResponse)
    if (cits.length > 0) {
      await prisma.citation.createMany({
        data: cits.map((c) => ({
          scanResultId: res.id,
          sourceUrl: c.sourceUrl,
          sourceDomain: c.sourceDomain,
          sourceTitle: c.sourceTitle,
          position: c.position,
        })),
      })
    }
  }

  await useCredits(authed.userId, CREDIT_COSTS.scan, 'scan', `API scan ${brand.name}`)

  void logApiUsage({
    userId: authed.userId,
    apiKeyId: authed.apiKeyId,
    endpoint: '/api/v1/scan',
    method: 'POST',
    status: 200,
    latencyMs: Date.now() - t0,
  })

  return NextResponse.json({ data: scan })
}
