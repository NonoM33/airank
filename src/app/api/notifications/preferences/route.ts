export const dynamic = 'force-dynamic'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  emailEnabled: z.boolean().optional(),
  slackEnabled: z.boolean().optional(),
  slackWebhook: z.string().url().optional().nullable(),
  smsEnabled: z.boolean().optional(),
  smsNumber: z.string().optional().nullable(),
  digestFrequency: z.enum(['realtime', 'hourly', 'daily', 'weekly']).optional(),
  scoreDropThreshold: z.number().int().min(1).max(100).optional(),
  mutedUntil: z.string().datetime().optional().nullable(),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const prefs = await prisma.notificationPreference.upsert({
    where: { userId: session.user.id },
    update: {},
    create: { userId: session.user.id },
  })

  return NextResponse.json(prefs)
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const prefs = await prisma.notificationPreference.upsert({
    where: { userId: session.user.id },
    update: {
      ...parsed.data,
      mutedUntil: parsed.data.mutedUntil ? new Date(parsed.data.mutedUntil) : undefined,
    },
    create: {
      userId: session.user.id,
      ...parsed.data,
      mutedUntil: parsed.data.mutedUntil ? new Date(parsed.data.mutedUntil) : undefined,
    },
  })

  return NextResponse.json(prefs)
}
