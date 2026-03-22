export const dynamic = "force-dynamic"
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const userId = session.user.id

  const brands = await prisma.brand.findMany({
    where: { userId },
    select: { id: true, name: true },
  })

  if (brands.length === 0) {
    return NextResponse.json({ brands: [], scans: [], globalScore: 0 })
  }

  const brandIds = brands.map((b) => b.id)

  const [latestScans, recentScans, totalScans] = await Promise.all([
    prisma.scan.findMany({
      where: { brandId: { in: brandIds } },
      orderBy: { createdAt: 'desc' },
      take: 1,
      include: { results: true },
    }),
    prisma.scan.findMany({
      where: {
        brandId: { in: brandIds },
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true, globalScore: true, brandId: true },
    }),
    prisma.scan.count({ where: { brandId: { in: brandIds } } }),
  ])

  const globalScore = latestScans[0]?.globalScore ?? 0

  return NextResponse.json({
    brands,
    globalScore,
    totalScans,
    recentScans: recentScans.map((s) => ({
      date: s.createdAt.toISOString(),
      score: s.globalScore,
    })),
  })
}
