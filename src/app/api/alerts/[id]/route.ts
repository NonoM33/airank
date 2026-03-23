export const dynamic = 'force-dynamic'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

// POST /api/alerts/[id]/read — mark alert as read
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { id } = await params

  try {
    const alert = await prisma.scoreAlert.findFirst({
      where: { id, userId: session.user.id },
    })
    if (!alert) {
      return NextResponse.json({ error: 'Alerte introuvable' }, { status: 404 })
    }

    const updated = await prisma.scoreAlert.update({
      where: { id },
      data: { read: true },
    })

    return NextResponse.json({ alert: updated })
  } catch (err) {
    console.error('[alerts] POST read error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE /api/alerts/[id] — delete alert
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { id } = await params

  try {
    const alert = await prisma.scoreAlert.findFirst({
      where: { id, userId: session.user.id },
    })
    if (!alert) {
      return NextResponse.json({ error: 'Alerte introuvable' }, { status: 404 })
    }

    await prisma.scoreAlert.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[alerts] DELETE error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
