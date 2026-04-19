export const dynamic = 'force-dynamic'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { generateApiKey } from '@/lib/api-auth'
import { getPlanLimits } from '@/lib/plan-data'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1).max(80),
  scopes: z.array(z.enum(['read', 'write', 'admin'])).default(['read']),
  expiresInDays: z.number().int().min(1).max(3650).optional(),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const keys = await prisma.apiKey.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      scopes: true,
      lastUsedAt: true,
      expiresAt: true,
      active: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ keys })
}

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
  if (!limits.apiAccess) {
    return NextResponse.json(
      { error: 'API réservée au plan Agency', upgrade: true },
      { status: 402 }
    )
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { name, scopes, expiresInDays } = parsed.data
  const { raw, hash, prefix } = generateApiKey()

  const key = await prisma.apiKey.create({
    data: {
      userId: session.user.id,
      name,
      keyHash: hash,
      keyPrefix: prefix,
      scopes: JSON.stringify(scopes),
      expiresAt: expiresInDays ? new Date(Date.now() + expiresInDays * 86400_000) : null,
    },
    select: { id: true, name: true, keyPrefix: true, createdAt: true },
  })

  // Return raw only ONCE. User must save it now.
  return NextResponse.json({ ...key, key: raw })
}
