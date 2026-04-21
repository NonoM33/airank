export const dynamic = 'force-dynamic'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getPlanLimits } from '@/lib/plan-data'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1).max(100),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const teams = await prisma.team.findMany({
    where: {
      OR: [
        { ownerId: session.user.id },
        { members: { some: { userId: session.user.id } } },
      ],
    },
    include: {
      _count: { select: { members: true, invites: true } },
      owner: { select: { id: true, email: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ teams })
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
  if (limits.teamSeats < 2) {
    return NextResponse.json(
      { error: 'Les équipes nécessitent le plan Starter ou supérieur', upgrade: true },
      { status: 402 }
    )
  }

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  // Retry on slug collision (#20). 5 attempts before giving up.
  const base = slugify(parsed.data.name)
  let team = null
  let lastErr: unknown = null
  for (let i = 0; i < 5; i++) {
    const slug = base + '-' + randomSuffix()
    try {
      team = await prisma.team.create({
        data: {
          name: parsed.data.name,
          slug,
          ownerId: session.user.id,
          seatLimit: limits.teamSeats,
          members: {
            create: { userId: session.user.id, role: 'OWNER' },
          },
        },
      })
      break
    } catch (err) {
      lastErr = err
      // Prisma unique constraint code P2002 → retry with new slug
      if ((err as { code?: string })?.code !== 'P2002') throw err
    }
  }
  if (!team) {
    console.error('[teams] slug collision after 5 attempts', lastErr)
    return NextResponse.json({ error: 'Réessayez dans un instant' }, { status: 503 })
  }

  return NextResponse.json(team)
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40)
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 8) // 6 chars (36^6 = ~2B)
}
