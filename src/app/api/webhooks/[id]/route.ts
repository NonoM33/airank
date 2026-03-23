export const dynamic = 'force-dynamic'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { id } = await params

  const webhook = await prisma.webhookConfig.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!webhook) {
    return NextResponse.json({ error: 'Webhook introuvable' }, { status: 404 })
  }

  await prisma.webhookConfig.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
