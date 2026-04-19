export const dynamic = 'force-dynamic'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { aggregateByDomain } from '@/lib/citations'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const brandId = searchParams.get('brandId') ?? undefined
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '100', 10), 500)

  // Fetch via ScanResult → Scan → Brand.userId
  const results = await prisma.scanResult.findMany({
    where: {
      scan: {
        brand: {
          userId: session.user.id,
          ...(brandId && { id: brandId }),
        },
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

  const allCitations = results.flatMap((r) =>
    r.citations.map((c) => ({
      ...c,
      llm: r.llm,
      scanId: r.scan.id,
      brandId: r.scan.brand.id,
      brandName: r.scan.brand.name,
      query: r.scan.query,
    }))
  )

  const byDomain = aggregateByDomain(allCitations)

  return NextResponse.json({
    total: allCitations.length,
    byDomain,
    citations: allCitations.slice(0, 200),
  })
}
