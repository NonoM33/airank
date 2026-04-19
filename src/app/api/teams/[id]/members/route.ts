export const dynamic = 'force-dynamic'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id: teamId } = await ctx.params
  const member = await prisma.teamMember.findFirst({
    where: { teamId, userId: session.user.id },
  })
  if (!member) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const members = await prisma.teamMember.findMany({
    where: { teamId },
    include: { user: { select: { id: true, email: true, name: true, image: true } } },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json({ members })
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id: teamId } = await ctx.params
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId requis' }, { status: 400 })

  const requester = await prisma.teamMember.findFirst({
    where: { teamId, userId: session.user.id },
  })
  if (!requester || (requester.role !== 'OWNER' && requester.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Seul owner/admin peut retirer un membre' }, { status: 403 })
  }

  await prisma.teamMember.deleteMany({ where: { teamId, userId } })
  return NextResponse.json({ ok: true })
}
