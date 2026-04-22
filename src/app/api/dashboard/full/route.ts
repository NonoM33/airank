export const dynamic = "force-dynamic"
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const userId = session.user.id
  const { searchParams } = new URL(req.url)
  const scopedBrandId = searchParams.get('brandId')

  const [allBrands, dbUser] = await Promise.all([
    prisma.brand.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { onboardingCompleted: true, plan: true },
    }),
  ])

  if (allBrands.length === 0) {
    return NextResponse.json({ allBrands: [], dbUser })
  }

  // When a specific brandId is requested (via global BrandSwitcher), always
  // return the single-brand view for that brand. Fall back to multi-brand grid
  // only when no brandId is pinned.
  const scopedBrand = scopedBrandId ? allBrands.find((b) => b.id === scopedBrandId) : null
  if (allBrands.length > 1 && !scopedBrand) {
    const brandsWithData = await Promise.all(
      allBrands.map(async (brand) => {
        const keywords: string[] = (() => {
          try { return JSON.parse(brand.keywords) as string[] } catch { return [] }
        })()
        const [latestScan, competitorRows] = await Promise.all([
          prisma.scan.findFirst({
            where: { brandId: brand.id },
            orderBy: { createdAt: 'desc' },
            include: { results: { select: { llm: true, mentioned: true } } },
          }),
          prisma.scanResult.findMany({
            where: { scan: { brandId: brand.id } },
            select: { competitors: true },
            orderBy: { id: 'desc' },
            take: 30,
          }),
        ])
        const competitorMap = new Map<string, number>()
        for (const row of competitorRows) {
          try {
            for (const c of JSON.parse(row.competitors) as string[]) {
              if (c.trim()) competitorMap.set(c, (competitorMap.get(c) ?? 0) + 1)
            }
          } catch { /* skip */ }
        }
        const topCompetitors = Array.from(competitorMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([name]) => name)
        return { brand, latestScan, topCompetitors, keywords }
      })
    )
    return NextResponse.json({ allBrands, dbUser, brandsWithData })
  }

  // Single brand — scoped by ?brandId= if provided, else first brand
  const brand = scopedBrand ?? allBrands[0]
  const [latestScan, prevScan, chartScans, recentScans, allResults, scoreObjective] = await Promise.all([
    prisma.scan.findFirst({
      where: { brandId: brand.id },
      orderBy: { createdAt: 'desc' },
      include: { results: true },
    }),
    prisma.scan.findFirst({
      where: { brandId: brand.id },
      orderBy: { createdAt: 'desc' },
      skip: 1,
      select: { globalScore: true },
    }),
    prisma.scan.findMany({
      where: {
        brandId: brand.id,
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true, globalScore: true },
    }),
    prisma.scan.findMany({
      where: { brandId: brand.id },
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: { results: { select: { llm: true, mentioned: true } } },
    }),
    prisma.scanResult.findMany({
      where: { scan: { brandId: brand.id } },
      select: { competitors: true },
    }),
    prisma.scoreObjective.findUnique({
      where: { userId_brandId: { userId, brandId: brand.id } },
    }),
  ])

  return NextResponse.json({
    allBrands,
    dbUser,
    brand,
    latestScan,
    prevScan,
    chartScans,
    recentScans,
    allResults,
    scoreObjective,
  })
}
