export const dynamic = 'force-dynamic'
import { authenticateApiRequest, logApiUsage } from '@/lib/api-auth'
import { rateLimit } from '@/lib/rate-limit'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const t0 = Date.now()
  const authed = await authenticateApiRequest(req)
  if (!authed) return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })

  const rl = rateLimit(`api:${authed.userId}`, 120, 60)
  if (!rl.allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })

  const { searchParams } = new URL(req.url)
  const brandId = searchParams.get('brandId') ?? undefined
  const days = Math.min(parseInt(searchParams.get('days') ?? '30', 10), 365)
  const since = new Date(Date.now() - days * 86400_000)

  const brandFilter = {
    userId: authed.userId,
    ...(brandId && { id: brandId }),
  }

  const [brandCount, scans, scansInWindow, results] = await Promise.all([
    prisma.brand.count({ where: brandFilter }),
    prisma.scan.findMany({
      where: { brand: brandFilter },
      select: { globalScore: true, createdAt: true, llmCount: true },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    }),
    prisma.scan.count({
      where: { brand: brandFilter, createdAt: { gte: since } },
    }),
    prisma.scanResult.findMany({
      where: { scan: { brand: brandFilter, createdAt: { gte: since } } },
      select: { mentioned: true, sentiment: true, score: true, llm: true },
    }),
  ])

  const avgScore =
    scans.length > 0
      ? Math.round(scans.reduce((s, x) => s + x.globalScore, 0) / scans.length)
      : 0
  const mentionRate =
    results.length > 0
      ? Math.round((results.filter((r) => r.mentioned).length / results.length) * 100)
      : 0
  const positiveRate =
    results.length > 0
      ? Math.round(
          (results.filter((r) => r.sentiment && ['POSITIVE', 'VERY_POSITIVE'].includes(r.sentiment)).length /
            results.length) *
            100
        )
      : 0

  const byLlm = new Map<string, { count: number; mentioned: number; score: number }>()
  for (const r of results) {
    const k = r.llm
    const prev = byLlm.get(k) ?? { count: 0, mentioned: 0, score: 0 }
    prev.count += 1
    if (r.mentioned) prev.mentioned += 1
    prev.score += r.score
    byLlm.set(k, prev)
  }

  void logApiUsage({
    userId: authed.userId,
    apiKeyId: authed.apiKeyId,
    endpoint: '/api/v1/analytics/overview',
    method: 'GET',
    status: 200,
    latencyMs: Date.now() - t0,
  })

  return NextResponse.json({
    data: {
      windowDays: days,
      brands: brandCount,
      totalScans: scans.length,
      scansInWindow,
      avgScore,
      mentionRate,
      positiveRate,
      byLlm: Object.fromEntries(
        Array.from(byLlm.entries()).map(([llm, v]) => [
          llm,
          {
            count: v.count,
            mentioned: v.mentioned,
            avgScore: v.count > 0 ? Math.round(v.score / v.count) : 0,
          },
        ])
      ),
    },
  })
}
