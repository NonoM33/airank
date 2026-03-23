export const dynamic = 'force-dynamic'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const objectiveSchema = z.object({
  brandId: z.string().min(1),
  targetScore: z.number().int().min(1).max(100),
  targetDate: z.string().min(1),
})

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const brandId = searchParams.get('brandId')

  if (!brandId) {
    return NextResponse.json({ error: 'brandId requis' }, { status: 400 })
  }

  // Verify brand belongs to user
  const brand = await prisma.brand.findFirst({
    where: { id: brandId, userId: session.user.id },
  })
  if (!brand) {
    return NextResponse.json({ error: 'Marque introuvable' }, { status: 404 })
  }

  const objective = await prisma.scoreObjective.findUnique({
    where: { userId_brandId: { userId: session.user.id, brandId } },
  })

  return NextResponse.json(objective)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = objectiveSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { brandId, targetScore, targetDate } = parsed.data

  // Verify brand belongs to user
  const brand = await prisma.brand.findFirst({
    where: { id: brandId, userId: session.user.id },
  })
  if (!brand) {
    return NextResponse.json({ error: 'Marque introuvable' }, { status: 404 })
  }

  const parsedDate = new Date(targetDate)
  if (isNaN(parsedDate.getTime())) {
    return NextResponse.json({ error: 'Date invalide' }, { status: 400 })
  }

  const objective = await prisma.scoreObjective.upsert({
    where: { userId_brandId: { userId: session.user.id, brandId } },
    create: {
      userId: session.user.id,
      brandId,
      targetScore,
      targetDate: parsedDate,
    },
    update: {
      targetScore,
      targetDate: parsedDate,
      achieved: false, // reset when updating target
    },
  })

  return NextResponse.json(objective)
}

export async function PUT(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const body = await req.json()
  const { brandId } = z.object({ brandId: z.string() }).parse(body)

  // Verify brand belongs to user
  const brand = await prisma.brand.findFirst({
    where: { id: brandId, userId: session.user.id },
  })
  if (!brand) {
    return NextResponse.json({ error: 'Marque introuvable' }, { status: 404 })
  }

  const objective = await prisma.scoreObjective.findUnique({
    where: { userId_brandId: { userId: session.user.id, brandId } },
  })
  if (!objective) {
    return NextResponse.json({ error: 'Objectif introuvable' }, { status: 404 })
  }

  // Get latest scan score
  const latestScan = await prisma.scan.findFirst({
    where: { brandId },
    orderBy: { createdAt: 'desc' },
    select: { globalScore: true },
  })

  const currentScore = latestScan?.globalScore ?? 0
  const achieved = currentScore >= objective.targetScore

  if (achieved && !objective.achieved) {
    const updated = await prisma.scoreObjective.update({
      where: { userId_brandId: { userId: session.user.id, brandId } },
      data: { achieved: true },
    })
    return NextResponse.json(updated)
  }

  return NextResponse.json(objective)
}
