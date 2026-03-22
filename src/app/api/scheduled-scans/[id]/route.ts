export const dynamic = "force-dynamic"
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { id } = await params

  const scan = await prisma.scheduledScan.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!scan) {
    return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  }

  await prisma.scheduledScan.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json().catch(() => null)

  const scan = await prisma.scheduledScan.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!scan) {
    return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  }

  const updated = await prisma.scheduledScan.update({
    where: { id },
    data: { enabled: body?.enabled ?? scan.enabled },
  })
  return NextResponse.json({ scan: updated })
}
