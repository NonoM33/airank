export const dynamic = "force-dynamic"
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getPlanLimits } from '@/lib/plan-data'
import { z } from 'zod'
import { NextResponse } from 'next/server'

const brandSchema = z.object({
  name: z.string().min(1).max(100),
  domain: z.string().optional(),
  sector: z.string().max(100).optional(),
  keywords: z.array(z.string()).default([]),
})

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const brands = await prisma.brand.findMany({
    where: { userId: session.user.id, isCompetitor: false },
    include: {
      competitors: true,
      scans: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { globalScore: true, createdAt: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const result = brands.map(({ scans, ...brand }) => ({
    ...brand,
    lastScore: scans[0]?.globalScore ?? null,
    lastScanAt: scans[0]?.createdAt ?? null,
  }))

  return NextResponse.json(result)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = brandSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { name, domain, sector, keywords } = parsed.data

  // Enforce per-plan brand cap (server-side paywall — not just hidden in the UI)
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { plan: true },
  })
  const limits = getPlanLimits(user?.plan ?? 'FREE')
  const brandCount = await prisma.brand.count({
    where: { userId: session.user.id, isCompetitor: false },
  })
  if (brandCount >= limits.brands) {
    return NextResponse.json(
      {
        error: `Limite de marques atteinte (${limits.brands}). Passez à un plan supérieur pour en ajouter davantage.`,
        code: 'BRAND_LIMIT',
        limit: limits.brands,
      },
      { status: 403 }
    )
  }

  const brand = await prisma.brand.create({
    data: {
      name,
      domain,
      sector,
      keywords: JSON.stringify(keywords),
      userId: session.user.id,
    },
  })

  return NextResponse.json(brand, { status: 201 })
}
