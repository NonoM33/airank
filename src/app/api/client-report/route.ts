export const dynamic = 'force-dynamic'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getPlanLimits } from '@/lib/plan-data'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { randomBytes } from 'crypto'

const schema = z.object({
  brandId: z.string(),
  expiresInDays: z.number().int().min(1).max(365).default(30),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { plan: true },
  })
  const limits = getPlanLimits(user?.plan ?? 'FREE')
  if (!limits.whiteLabel && !limits.pdfExport) {
    return NextResponse.json(
      { error: 'Les rapports clients nécessitent le plan Pro ou supérieur', upgrade: true },
      { status: 402 }
    )
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { brandId, expiresInDays } = parsed.data
  const brand = await prisma.brand.findFirst({
    where: { id: brandId, userId: session.user.id },
  })
  if (!brand) return NextResponse.json({ error: 'Marque introuvable' }, { status: 404 })

  // Use DashboardView model to store the shareable link config
  const token = randomBytes(24).toString('hex')
  await prisma.dashboardView.create({
    data: {
      userId: session.user.id,
      name: `Client report ${brand.name}`,
      config: {
        kind: 'client_report',
        brandId,
        token,
        expiresAt: new Date(Date.now() + expiresInDays * 86400_000).toISOString(),
      },
    },
  })

  return NextResponse.json({
    url: `/client-report/${token}`,
    expiresAt: new Date(Date.now() + expiresInDays * 86400_000).toISOString(),
  })
}
