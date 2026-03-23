export const dynamic = 'force-dynamic'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { id } = await params
  const analysis = await prisma.analysisResult.findFirst({
    where: { id, userId: session.user.id },
  })

  if (!analysis) {
    return NextResponse.json({ error: 'Analyse introuvable' }, { status: 404 })
  }

  return NextResponse.json(analysis)
}
