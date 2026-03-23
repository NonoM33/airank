export const dynamic = "force-dynamic"
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1).max(100),
  domain: z.string().optional(),
  keywords: z.array(z.string()).default([]),
  parentBrandId: z.string(),
})

// POST /api/brands/track-competitor
// Creates a Brand marked as a tracked competitor
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { name, domain, keywords, parentBrandId } = parsed.data

  // Verify the parent brand belongs to this user
  const parentBrand = await prisma.brand.findFirst({
    where: { id: parentBrandId, userId: session.user.id, isCompetitor: false },
  })
  if (!parentBrand) {
    return NextResponse.json({ error: 'Marque parente introuvable' }, { status: 404 })
  }

  // Check if already tracked as competitor OR already exists as a user brand
  const existing = await prisma.brand.findFirst({
    where: {
      userId: session.user.id,
      name: { equals: name, mode: 'insensitive' },
    },
  })
  if (existing) {
    return NextResponse.json({ brand: existing, alreadyTracked: true })
  }

  const brand = await prisma.brand.create({
    data: {
      name,
      domain: domain ?? null,
      keywords: JSON.stringify(keywords),
      isCompetitor: true,
      parentBrandId,
      userId: session.user.id,
    },
  })

  return NextResponse.json({ brand }, { status: 201 })
}

// GET /api/brands/track-competitor?parentBrandId=xxx
// Returns all tracked competitor brands for a given parent brand
export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const parentBrandId = searchParams.get('parentBrandId')

  const competitors = await prisma.brand.findMany({
    where: {
      userId: session.user.id,
      isCompetitor: true,
      ...(parentBrandId ? { parentBrandId } : {}),
    },
    include: {
      scans: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { globalScore: true, createdAt: true, results: { select: { llm: true, mentioned: true, score: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const result = competitors.map(({ scans, ...brand }) => ({
    ...brand,
    lastScore: scans[0]?.globalScore ?? null,
    lastScanAt: scans[0]?.createdAt ?? null,
    lastScanResults: scans[0]?.results ?? [],
  }))

  return NextResponse.json({ competitors: result })
}
