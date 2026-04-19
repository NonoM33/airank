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
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200)

  const scans = await prisma.scan.findMany({
    where: {
      brand: { userId: authed.userId },
      ...(brandId && { brandId }),
    },
    include: {
      results: {
        select: {
          llm: true,
          mentioned: true,
          position: true,
          sentiment: true,
          sentimentScore: true,
          score: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  void logApiUsage({
    userId: authed.userId,
    apiKeyId: authed.apiKeyId,
    endpoint: '/api/v1/scans',
    method: 'GET',
    status: 200,
    latencyMs: Date.now() - t0,
  })

  return NextResponse.json({ data: scans })
}
