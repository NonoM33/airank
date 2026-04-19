export const dynamic = 'force-dynamic'
import { authenticateApiRequest, logApiUsage } from '@/lib/api-auth'
import { rateLimit } from '@/lib/rate-limit'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const t0 = Date.now()
  const authed = await authenticateApiRequest(req)
  if (!authed) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
  }

  const rl = rateLimit(`api:${authed.userId}`, 120, 60)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, {
      status: 429,
      headers: {
        'X-RateLimit-Limit': '120',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.floor(rl.resetAt / 1000)),
      },
    })
  }

  const brands = await prisma.brand.findMany({
    where: { userId: authed.userId },
    select: {
      id: true,
      name: true,
      domain: true,
      keywords: true,
      sector: true,
      isCompetitor: true,
      createdAt: true,
    },
  })

  const response = NextResponse.json({ data: brands.map(b => ({ ...b, keywords: safeJson(b.keywords) })) })
  response.headers.set('X-RateLimit-Limit', '120')
  response.headers.set('X-RateLimit-Remaining', String(rl.remaining))

  void logApiUsage({
    userId: authed.userId,
    apiKeyId: authed.apiKeyId,
    endpoint: '/api/v1/brands',
    method: 'GET',
    status: 200,
    latencyMs: Date.now() - t0,
  })

  return response
}

function safeJson(s: string): unknown {
  try { return JSON.parse(s) } catch { return [] }
}
