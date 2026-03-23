export const dynamic = 'force-dynamic'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getPlanLimits } from '@/lib/plan-limits'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { randomBytes } from 'crypto'

const webhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).min(1),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const webhooks = await prisma.webhookConfig.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      url: true,
      events: true,
      active: true,
      createdAt: true,
      // Do not expose the secret
    },
  })

  return NextResponse.json(
    webhooks.map((wh) => ({
      ...wh,
      events: JSON.parse(wh.events) as string[],
    }))
  )
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const limits = getPlanLimits(session.user.plan ?? 'FREE')
  if (!limits.webhooks) {
    return NextResponse.json(
      { error: 'Webhooks disponibles uniquement pour le plan Agency' },
      { status: 403 }
    )
  }

  const body = await req.json()
  const parsed = webhookSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { url, events } = parsed.data
  const secret = randomBytes(32).toString('hex')

  const webhook = await prisma.webhookConfig.create({
    data: {
      userId: session.user.id,
      url,
      events: JSON.stringify(events),
      secret,
    },
  })

  return NextResponse.json(
    {
      id: webhook.id,
      url: webhook.url,
      events,
      active: webhook.active,
      createdAt: webhook.createdAt,
      secret, // Return secret only on creation
    },
    { status: 201 }
  )
}
