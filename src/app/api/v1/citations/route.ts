export const dynamic = 'force-dynamic'
import { authenticateApiRequest, logApiUsage } from '@/lib/api-auth'
import { rateLimit } from '@/lib/rate-limit'
import { prisma } from '@/lib/db'
import { aggregateByDomain } from '@/lib/citations'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const t0 = Date.now()
  const authed = await authenticateApiRequest(req)
  if (!authed) return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })

  const rl = rateLimit(`api:${authed.userId}`, 120, 60)
  if (!rl.allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })

  const { searchParams } = new URL(req.url)
  const brandId = searchParams.get('brandId') ?? undefined
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '100', 10), 500)

  const results = await prisma.scanResult.findMany({
    where: {
      scan: {
        brand: { userId: authed.userId, ...(brandId && { id: brandId }) },
      },
    },
    select: {
      citations: {
        select: {
          sourceUrl: true,
          sourceDomain: true,
          sourceTitle: true,
          position: true,
          createdAt: true,
        },
      },
      llm: true,
      scan: { select: { id: true, query: true, brand: { select: { id: true, name: true } } } },
    },
    orderBy: { scan: { createdAt: 'desc' } },
    take: limit,
  })

  const all = results.flatMap((r) =>
    r.citations.map((c) => ({
      ...c,
      llm: r.llm,
      scanId: r.scan.id,
      brandId: r.scan.brand.id,
      brandName: r.scan.brand.name,
      query: r.scan.query,
    }))
  )

  void logApiUsage({
    userId: authed.userId,
    apiKeyId: authed.apiKeyId,
    endpoint: '/api/v1/citations',
    method: 'GET',
    status: 200,
    latencyMs: Date.now() - t0,
  })

  return NextResponse.json({
    data: {
      total: all.length,
      byDomain: aggregateByDomain(all),
      citations: all.slice(0, 200),
    },
  })
}
