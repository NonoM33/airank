export const dynamic = "force-dynamic"
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { NextResponse } from 'next/server'

const brandSchema = z.object({
  name: z.string().min(1).max(100),
  domain: z.string().optional(),
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

  const { name, domain, keywords } = parsed.data

  const brand = await prisma.brand.create({
    data: {
      name,
      domain,
      keywords: JSON.stringify(keywords),
      userId: session.user.id,
    },
  })

  return NextResponse.json(brand, { status: 201 })
}
