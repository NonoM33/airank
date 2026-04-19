export const dynamic = 'force-dynamic'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({ token: z.string() })

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Token invalide' }, { status: 400 })

  const invite = await prisma.teamInvite.findUnique({ where: { token: parsed.data.token } })
  if (!invite) return NextResponse.json({ error: 'Invitation introuvable' }, { status: 404 })
  if (invite.acceptedAt) return NextResponse.json({ error: 'Invitation déjà utilisée' }, { status: 410 })
  if (invite.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: 'Invitation expirée' }, { status: 410 })
  }

  // Ensure invited email matches session (or allow if user email matches)
  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user || user.email !== invite.email) {
    return NextResponse.json({ error: 'Cette invitation est destinée à un autre email' }, { status: 403 })
  }

  await prisma.$transaction([
    prisma.teamMember.create({
      data: { teamId: invite.teamId, userId: session.user.id, role: invite.role },
    }),
    prisma.teamInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    }),
  ])

  return NextResponse.json({ ok: true, teamId: invite.teamId })
}
