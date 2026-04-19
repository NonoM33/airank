export const dynamic = 'force-dynamic'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { createNotification } from '@/lib/notifications'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { randomBytes } from 'crypto'

const schema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'EDITOR', 'VIEWER', 'CLIENT']).default('VIEWER'),
})

// POST = create invite, GET = list invites
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id: teamId } = await ctx.params
  const team = await prisma.team.findFirst({
    where: {
      id: teamId,
      OR: [
        { ownerId: session.user.id },
        { members: { some: { userId: session.user.id, role: { in: ['OWNER', 'ADMIN'] } } } },
      ],
    },
    include: { _count: { select: { members: true } } },
  })
  if (!team) return NextResponse.json({ error: 'Équipe introuvable ou accès refusé' }, { status: 403 })

  if (team._count.members >= team.seatLimit) {
    return NextResponse.json({ error: 'Limite de sièges atteinte', upgrade: true }, { status: 402 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const token = randomBytes(24).toString('hex')
  const invite = await prisma.teamInvite.create({
    data: {
      teamId,
      email: parsed.data.email,
      role: parsed.data.role,
      token,
      invitedById: session.user.id,
      expiresAt: new Date(Date.now() + 7 * 86400_000),
    },
  })

  // If user exists, notify in-app
  const invitedUser = await prisma.user.findUnique({ where: { email: parsed.data.email } })
  if (invitedUser) {
    void createNotification(invitedUser.id, {
      type: 'TEAM_INVITE',
      title: `Invitation à rejoindre ${team.name}`,
      body: `Vous avez été invité en tant que ${parsed.data.role.toLowerCase()}`,
      link: `/team/accept?token=${token}`,
      iconKey: 'user-plus',
    })
  }

  return NextResponse.json({ invite, inviteUrl: `/team/accept?token=${token}` })
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id: teamId } = await ctx.params
  const member = await prisma.teamMember.findFirst({
    where: { teamId, userId: session.user.id },
  })
  if (!member) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const invites = await prisma.teamInvite.findMany({
    where: { teamId, acceptedAt: null },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ invites })
}
