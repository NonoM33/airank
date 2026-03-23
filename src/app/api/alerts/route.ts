export const dynamic = 'force-dynamic'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { z } from 'zod'

// GET /api/alerts?brandId=xxx&unread=true&source=alert|score_alert
export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const brandId = searchParams.get('brandId')
  const unreadOnly = searchParams.get('unread') === 'true'
  const source = searchParams.get('source') // 'alert' | 'score_alert' | null (both)

  try {
    const where = {
      userId: session.user.id,
      ...(brandId ? { brandId } : {}),
      ...(unreadOnly ? { read: false } : {}),
    }

    if (source === 'alert') {
      const alerts = await prisma.alert.findMany({
        where,
        include: { brand: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      })
      return NextResponse.json({ alerts })
    }

    const alerts = await prisma.scoreAlert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ alerts })
  } catch (err) {
    console.error('[alerts] GET error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

const createSchema = z.object({
  type: z.enum(['score_below', 'score_above', 'no_mention', 'competitor_spike']),
  brandId: z.string().optional(),
  threshold: z.number().min(0).max(100).optional(),
  message: z.string().min(1).max(500),
})

// POST /api/alerts — create user-defined veille alert
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

  const { type, brandId, threshold, message } = parsed.data

  if (brandId) {
    const brand = await prisma.brand.findFirst({
      where: { id: brandId, userId: session.user.id },
    })
    if (!brand) {
      return NextResponse.json({ error: 'Marque introuvable' }, { status: 404 })
    }
  }

  try {
    const alert = await prisma.alert.create({
      data: {
        userId: session.user.id,
        type,
        brandId: brandId ?? null,
        threshold: threshold ?? null,
        message,
      },
      include: { brand: { select: { id: true, name: true } } },
    })
    return NextResponse.json({ alert }, { status: 201 })
  } catch (err) {
    console.error('[alerts] POST error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
