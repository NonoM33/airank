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

  const slug = slugify(parsed.data.name) + '-' + Math.random().toString(36).slice(2, 6)

  const team = await prisma.team.create({
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

  return NextResponse.json(team)
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40)
}
