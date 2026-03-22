export const dynamic = "force-dynamic"
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const createSchema = z.object({
  brandId: z.string(),
  frequency: z.enum(['weekly', 'biweekly', 'monthly']),
})

function computeNextRun(frequency: string): Date {
  const now = new Date()
  switch (frequency) {
    case 'weekly':
      now.setDate(now.getDate() + 7)
      break
    case 'biweekly':
      now.setDate(now.getDate() + 14)
      break
    case 'monthly':
      now.setMonth(now.getMonth() + 1)
      break
  }
  return now
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const scans = await prisma.scheduledScan.findMany({
    where: { userId: session.user.id },
    include: { brand: { select: { name: true, domain: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ scans })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
  }

  const { brandId, frequency } = parsed.data

  const brand = await prisma.brand.findFirst({
    where: { id: brandId, userId: session.user.id },
  })
  if (!brand) {
    return NextResponse.json({ error: 'Marque introuvable' }, { status: 404 })
  }

  // Upsert: one scheduled scan per brand
  const existing = await prisma.scheduledScan.findFirst({
    where: { brandId, userId: session.user.id },
  })

  if (existing) {
    const updated = await prisma.scheduledScan.update({
      where: { id: existing.id },
      data: { frequency, nextRunAt: computeNextRun(frequency), enabled: true },
    })
    return NextResponse.json({ scan: updated })
  }

  const scan = await prisma.scheduledScan.create({
    data: {
      brandId,
      userId: session.user.id,
      frequency,
      nextRunAt: computeNextRun(frequency),
    },
  })

  return NextResponse.json({ scan })
}
