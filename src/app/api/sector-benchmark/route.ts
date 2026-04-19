export const dynamic = 'force-dynamic'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { buildSectorBenchmark } from '@/lib/sector-benchmark'
import { getPlanLimits } from '@/lib/plan-data'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const brandId = searchParams.get('brandId')
  const sinceDays = Math.min(parseInt(searchParams.get('sinceDays') ?? '30', 10), 365)

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { plan: true },
  })
  const limits = getPlanLimits(user?.plan ?? 'FREE')
  if (!limits.benchmarkSector) {
    return NextResponse.json(
      { error: 'Benchmark sectoriel non disponible dans votre plan', upgrade: true },
      { status: 402 }
    )
  }

  if (!brandId) return NextResponse.json({ error: 'brandId requis' }, { status: 400 })

  const brand = await prisma.brand.findFirst({
    where: { id: brandId, userId: session.user.id },
    select: { name: true, sector: true },
  })
  if (!brand) return NextResponse.json({ error: 'Marque introuvable' }, { status: 404 })
  if (!brand.sector) {
    return NextResponse.json(
      { error: 'Définissez un secteur pour votre marque pour accéder au benchmark' },
      { status: 400 }
    )
  }

  const rows = await buildSectorBenchmark(brand.sector, brand.name, sinceDays)

  return NextResponse.json({
    sector: brand.sector,
    yourBrand: brand.name,
    rows,
    totalBrands: rows.length,
    yourRank: rows.find((r) => r.isYou)?.rank ?? null,
  })
}
