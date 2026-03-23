export const dynamic = 'force-dynamic'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET /api/alerts?brandId=xxx&unread=true
export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const brandId = searchParams.get('brandId')
  const unreadOnly = searchParams.get('unread') === 'true'

  try {
    const alerts = await prisma.scoreAlert.findMany({
      where: {
        userId: session.user.id,
        ...(brandId ? { brandId } : {}),
        ...(unreadOnly ? { read: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ alerts })
  } catch (err) {
    console.error('[alerts] GET error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
