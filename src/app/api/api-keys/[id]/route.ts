export const dynamic = 'force-dynamic'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { id } = await ctx.params
  const key = await prisma.apiKey.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!key) return NextResponse.json({ error: 'Clé introuvable' }, { status: 404 })

  await prisma.apiKey.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
